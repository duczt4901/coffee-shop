import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const layers = JSON.parse(readFileSync("src/data/coffee-parallax.json", "utf8"));
const source = ts.transpileModule(readFileSync("src/components/experience/CoffeeParallaxScene.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function load(react) {
    const exports = {};
    vm.runInNewContext(source, { exports, require(name) {
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return jsxRuntime;
        if (name.endsWith("coffee-parallax.json")) return layers;
        if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
        throw Error(`Unexpected runtime dependency: ${name}`);
    } });
    return exports.CoffeeParallaxScene;
}

test("server HTML contains four independent product photos and three bean layers without WebGL/background", () => {
    const Scene = load(React);
    const html = renderToStaticMarkup(React.createElement(Scene, { ref: null }));
    assert.equal((html.match(/<picture /g) ?? []).length, 7);
    assert.equal((html.match(/<img /g) ?? []).length, 7);
    assert.deepEqual([...html.matchAll(/data-coffee-layer="([^"]+)"/g)].map(match => match[1]), ["back", "blue", "orange", "cup", "green", "middle", "front"]);
    assert.doesNotMatch(html, /<canvas[\s>]|\.glb|data-coffee-layer="background"/);
    assert.match(html, /data-coffee-state="2d"/);
    assert.match(html, /data-parallax-ready="false"/);
    for (const variant of ["desktop", "mobile"]) for (const layer of ["blue", "orange", "cup", "green", "middle", "back", "front"]) assert(html.includes(layers[variant][layer].src));
    assert(!html.includes(layers.desktop.products.src), "the combined fallback must not also be downloaded in the normal scene");
});

test("baked layers have real alpha, consistent dimensions and small WebP payloads", async () => {
    for (const variant of ["desktop", "mobile"]) {
        let total = 0;
        let photoPixels = 0;
        for (const [name, image] of Object.entries(layers[variant])) {
            const bytes = readFileSync(`public${image.src}`);
            const metadata = await sharp(bytes).metadata();
            const stats = await sharp(bytes).stats();
            assert.equal(metadata.format, "webp");
            assert.equal(metadata.hasAlpha, true);
            assert.equal(metadata.width, image.width);
            assert.equal(metadata.height, image.height);
            const product = layers[variant].products;
            assert(Math.abs(image.frameWidth / image.frameHeight - product.frameWidth / product.frameHeight) < 0.001, "layers must retain the same framing despite cropped images");
            assert(image.left >= 0 && image.top >= 0 && image.left + image.displayWidth <= 100.01 && image.top + image.displayHeight <= 100.01, "crop must stay inside the original artboard");
            if (["blue", "orange", "cup", "green"].includes(name)) {
                assert(image.frameWidth >= (variant === "desktop" ? 2560 : 1170), "cutouts must retain the high-resolution export scale");
                photoPixels += image.width * image.height;
            }
            assert.equal(bytes.length, image.bytes);
            assert.equal(stats.channels[3].min, 0, "there must be no baked background fill");
            assert(stats.channels[3].max > 0, "a layer must not be empty");
            total += bytes.length;
        }
        assert(total < 1_000_000, "the high-quality layered scene should remain below 1 MB");
        assert(photoPixels < layers[variant].products.width * layers[variant].products.height * 2, "four cutouts must not allocate four full-size transparent textures");
    }
});

test("product cutouts retain the full scene's interacted lighting and shadows", async () => {
    for (const variant of ["desktop", "mobile"]) {
        const full = await sharp(`public${layers[variant].products.src}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        for (const name of ["blue", "orange", "cup", "green"]) {
            const image = layers[variant][name];
            const cutout = await sharp(`public${image.src}`).ensureAlpha().raw().toBuffer();
            const left = Math.round(image.left / 100 * image.frameWidth), top = Math.round(image.top / 100 * image.frameHeight);
            let error = 0, channels = 0;
            for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
                const i = (y * image.width + x) * 4, j = ((top + y) * full.info.width + left + x) * 4;
                if (cutout[i + 3] < 250 || full.data[j + 3] < 250) continue;
                for (let c = 0; c < 3; c++) error += Math.abs(cutout[i + c] - full.data[j + c]);
                channels += 3;
            }
            assert(channels > 1000, `${variant}/${name} must contain visible product pixels`);
            assert(error / channels < 2, `${variant}/${name} must match the full scene, allowing small WebP compression differences`);
        }
    }
});

test("scroll only updates bounded CSS progress; cached loads and errors keep a usable image", () => {
    const refs = [], writes = [], attributes = new Set();
    let index = 0, status = "loading", effect, handle;
    const Scene = load({
        useRef(value) { return refs[index++] ??= { current: value }; },
        useState: () => [status, value => { status = typeof value === "function" ? value(status) : value; }],
        useEffect: callback => { effect = callback; },
        useImperativeHandle: (_ref, create) => { handle = create(); },
    });
    const render = () => { index = 0; return Scene({ ref: null }); };
    let tree = render();
    const images = ["blue", "orange", "cup"].map(id => ({ complete: true, naturalWidth: 300, dataset: { coffeeLayer: id } }));
    refs[0].current = { querySelectorAll: () => images, style: { setProperty: (name, value) => writes.push([name, value]) }, toggleAttribute(name, value) { if (value) attributes.add(name); else attributes.delete(name); } };
    effect();
    tree = render();
    assert.equal(tree.props["data-parallax-ready"], false, "wait for all four product photos before revealing beans");
    images.push({ complete: true, naturalWidth: 300, dataset: { coffeeLayer: "green" } });
    effect();
    tree = render();
    assert.equal(tree.props["data-parallax-ready"], true);
    handle.setProgress(0.5); handle.setProgress(0.5);
    assert.equal(writes.length, 1);
    assert.equal(writes[0][1], "0");
    assert(attributes.has("data-parallax-active"));
    handle.setProgress(2);
    assert.equal(writes.at(-1)[1], "0.5");
    assert(!attributes.has("data-parallax-active"));
    const pictures = tree.props.children.props.children.props.children;
    const photos = pictures.filter(item => ["blue", "orange", "cup", "green"].includes(item.key));
    assert.equal(new Set(photos.map(item => item.props.style["--drift-y"])).size, 4, "each product has a distinct speed driven by the same progress");
    const product = pictures.find(item => item.key === "cup").props.children[1];
    product.props.onError({});
    tree = render();
    assert.equal(tree.props["data-parallax-fallback"], true);
    const fallback = tree.props.children.props.children.props.children;
    assert.equal(fallback.length, 1);
    assert.equal(fallback[0].props.children[1].props.src, layers.desktop.products.src);
    fallback[0].props.children[1].props.onLoad();
    assert.equal(status, "fallback");
});
