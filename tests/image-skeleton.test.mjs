import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

function load(file, react, revealLoadedImage = () => {}) {
    const exports = {};
    const compiled = ts.transpileModule(readFileSync(`src/components/ui/${file}.tsx`, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(compiled, { exports, require(name) {
        if (name === "react/jsx-runtime") return jsxRuntime;
        if (name === "react") return react;
        if (name === "next/image") return { __esModule: true, default: () => null };
        if (name === "@/lib/utils") return { cn: (...names) => names.filter(Boolean).join(" ") };
        if (name === "@/lib/image-load-reveal") return { revealLoadedImage };
        if (name === "@/data/image-placeholders.json") return { "/preview.webp": "data:image/webp;base64,preview" };
        if (name === "@/data/responsive-images.json") return { "/product.webp": "/product-320.webp 320w, /product.webp 1254w" };
        throw Error(`Unexpected import: ${name}`);
    } });
    return exports;
}

test("skeleton settles on load/error, forwards events and restarts for another image", () => {
    let state = null, loaded = 0, failed = 0;
    const { SkeletonImage } = load("SkeletonImage", { useState: () => [state, value => { state = value; }] });
    const props = { src: "/one.webp", alt: "Coffee", className: "object-cover", onLoad: () => loaded++, onError: () => failed++ };
    const render = (src = props.src) => SkeletonImage({ ...props, src }).props;
    assert.match(render().className, /object-cover.*motion-safe:animate-pulse.*bg-foreground\/10/);
    assert.equal(render().alt, "Coffee");
    assert.equal(render().placeholder, "empty");
    const preview = render("/preview.webp");
    assert.equal(preview.placeholder, "blur");
    assert.equal(preview.blurDataURL, "data:image/webp;base64,preview");
    assert.doesNotMatch(preview.className, /animate-pulse/);
    render().onLoad({});
    assert.equal(loaded, 1);
    assert.equal(render().className, "object-cover");
    assert.match(render("/two.webp").className, /animate-pulse/);
    render("/two.webp").onError({});
    assert.equal(failed, 1);
    assert.doesNotMatch(render("/two.webp").className, /animate-pulse/);
    assert.match(render("/two.webp").className, /bg-foreground\/10/);
});

test("responsive pictures preserve image sizing/events and let the browser choose a source", () => {
    const { SkeletonImage } = load("SkeletonImage", { useState: () => [null, () => {}] });
    const picture = SkeletonImage({ src: "/product.webp", alt: "Coffee", fill: true, sizes: "50vw", className: "contain" });
    assert.equal(picture.type, "picture");
    assert.equal(picture.props.style.display, "contents");
    const [source, image] = picture.props.children;
    assert.equal(source.props.sizes, "50vw");
    assert.equal(source.props.style.display, "none", "metadata must not become a flex item and add a gap");
    assert.match(source.props.srcSet, /320w/);
    assert.equal(image.props.src, "/product.webp");
    assert.equal(image.props.fill, true);
    assert.equal(typeof image.props.onError, "function");
});

test("blur-to-sharp runs once per load, preserves existing filters and respects reduced motion", () => {
    let reduced = false, reads = 0;
    const animations = [];
    const exports = {};
    const source = ts.transpileModule(readFileSync("src/lib/image-load-reveal.ts", "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
        exports,
        window: { matchMedia: () => ({ matches: reduced }) },
        getComputedStyle() { reads++; return { filter: "drop-shadow(0px 2px 4px black)" }; },
    });
    const image = { animate: (frames, options) => animations.push({ frames, options }) };
    exports.revealLoadedImage(image);
    assert.equal(animations.length, 1);
    assert.equal(animations[0].frames[0].filter, "drop-shadow(0px 2px 4px black) blur(4px)");
    assert.equal(animations[0].frames[1].filter, "drop-shadow(0px 2px 4px black)");
    assert.equal(animations[0].options.duration, 500);
    assert.equal(animations[0].options.fill, undefined, "filter must be released after finishing");
    reduced = true;
    exports.revealLoadedImage(image);
    exports.revealLoadedImage({});
    assert.equal(animations.length, 1);
    assert.equal(reads, 1);
});

test("CMS images settle after cached loads and captured load/error events", () => {
    let setup, reveals = 0;
    const cached = { complete: true, dataset: {} }, pending = { complete: false, dataset: {} };
    const { SkeletonHtml } = load("SkeletonHtml", {
        useRef: () => ({ current: { querySelectorAll: () => [cached, pending] } }),
        useEffect: effect => { setup = effect; },
    }, () => { reveals++; });
    const tree = SkeletonHtml({ html: '<img src="/one.webp">', className: "body" });
    setup();
    assert.equal(cached.dataset.imageReady, "true");
    assert.equal(pending.dataset.imageReady, undefined);
    const loaded = { ...pending, tagName: "IMG", naturalWidth: 24 };
    tree.props.onLoadCapture({ type: "load", target: loaded });
    assert.equal(pending.dataset.imageReady, "true");
    tree.props.onLoadCapture({ type: "load", target: loaded });
    const broken = { tagName: "IMG", dataset: {} };
    tree.props.onErrorCapture({ type: "error", target: broken });
    assert.equal(broken.dataset.imageReady, "true");
    assert.equal(reveals, 1, "only a successful first load should animate");
    assert.equal(tree.props.dangerouslySetInnerHTML.__html, '<img src="/one.webp">');
});
