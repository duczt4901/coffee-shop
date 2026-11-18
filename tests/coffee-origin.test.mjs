import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const compiled = ["CoffeeProcessSlideshow.tsx", "coffee-process-slideshow-runtime.ts", "coffee-origin-runtime.ts", "CoffeeOriginSection.tsx"].map(file => ts.transpileModule(readFileSync(`src/components/sections/home-page/${file}`, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText);

const storyData = {};
const pageContent = {};
const pageImages = {};
vm.runInNewContext(ts.transpileModule(readFileSync("src/data/page-content.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: pageContent });
vm.runInNewContext(ts.transpileModule(readFileSync("src/data/page-images.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: pageImages });
vm.runInNewContext(ts.transpileModule(readFileSync("src/data/coffee-stories.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: storyData, require: name => name === "@/data/page-images" ? pageImages : pageContent });

function element() {
    const attributes = new Map();
    let writes = 0;
    return {
        attributes,
        get writes() { return writes; },
        style: new Proxy({ setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } }, {
            set(target, name, value) { writes++; target[name] = value; return true; },
        }),
        setAttribute(name, value) { writes++; attributes.set(name, value); },
        removeAttribute(name) { attributes.delete(name); },
        toggleAttribute(name, value) { if (value) attributes.set(name, ""); else attributes.delete(name); },
    };
}

function mount({ initialTop = 1200, incompleteStory = false, initialFailure = false, reduced = false, imageFailure = false } = {}) {
    const root = element(), map = element(), shape = element(), fill = element(), borders = element(), copy = element();
    const mask = { ...element(), hidden: true };
    const title = element(), titleTrack = element();
    const slides = Array.from({ length: 3 }, element), images = Array.from({ length: 3 }, element), titles = Array.from({ length: 3 }, element);
    const metrics = { width: 1200, height: 800, intro: 560, story: 2800 };
    const reads = { width: 0, height: 0, intro: 0, bounds: 0 };
    const stage = {
        get clientWidth() { reads.width++; if (failed) throw Error("layout unavailable"); return metrics.width; },
        get clientHeight() { reads.height++; return metrics.height; },
    };
    const storyStart = { get offsetTop() { reads.intro++; return metrics.intro; } };
    const slider = { ...element(), tabIndex: 0, scrollLeft: 0 };
    const track = { querySelectorAll: selector => selector === ".slide" ? slides : images };
    const photo = {
        querySelector: selector => ({ ".slideTrack": incompleteStory ? null : track, ".viewport": slider, ".title": title })[selector],
        querySelectorAll: () => titles,
    };
    title.querySelector = () => titleTrack;
    root.querySelector = selector => ({
        ".introCopy": copy, ".map": map, ".stickyViewport": stage, "[data-origin-shape]": shape,
        "[data-origin-borders]": borders, ".provinceFill": fill, "[data-coffee-story-start]": storyStart, ".slideshow": photo, ".mapMask": mask,
    })[selector];
    root.querySelectorAll = () => [];
    root.getBoundingClientRect = () => { reads.bounds++; return { top, height: metrics.height + metrics.intro + metrics.story }; };
    let top = initialTop, failed = initialFailure, active = false, effect, update, mapImage;
    let viewportHeight = 800;
    const events = new EventTarget(), media = Object.assign(new EventTarget(), { matches: reduced });
    const observers = new Set();
    class Observer {
        constructor(callback) { this.callback = callback; observers.add(this); }
        observe() {}
        disconnect() { observers.delete(this); }
    }
    class MapImage {
        constructor() { if (imageFailure) throw Error("image unavailable"); mapImage = this; }
    }
    const react = { useRef: () => ({ current: root }), useId: () => "origin-test", useLayoutEffect(setup) { effect = setup; } };
    let storyModule, storyRuntime, originRuntime;
    const modules = compiled.map((code, index) => {
        const exports = {};
        vm.runInNewContext(code, {
            exports, Image: MapImage, ResizeObserver: Observer,
            window: {
                get innerHeight() { return viewportHeight; },
                matchMedia: query => query.includes("prefers-reduced-motion") ? media : { matches: metrics.width < 1024 },
                addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
            },
            require(name) {
                if (name === "@/data/page-content") return pageContent;
                if (name === "react/jsx-runtime") return jsxRuntime;
                if (name === "@/data/coffee-stories") return storyData;
                if (name.endsWith("enhance-when-visible")) return { enhanceWhenVisible() {} };
                if (name.endsWith("coffee-process-slideshow-runtime")) return storyRuntime;
                if (name === "@/components/ui/SkeletonImage") return { SkeletonImage: ({ fill, sizes, ...props }) => jsxRuntime.jsx("img", props) };
                if (name === "react") return react;
                if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
                if (name.endsWith("CoffeeProcessSlideshow")) return storyModule;
                if (name.endsWith("native-motion")) return { observeScroll(sync, onError) {
                    active = true;
                    const stop = () => { active = false; };
                    update = () => { if (active) { try { sync(); } catch (error) { stop(); onError(error); } } };
                    try { sync(); } catch (error) { stop(); throw error; }
                    return stop;
                } };
                throw Error(`Unexpected dependency: ${name}`);
            },
        });
        if (index === 0) storyModule = exports;
        if (index === 1) storyRuntime = exports;
        if (index === 2) originRuntime = exports;
        return exports;
    });
    const markup = modules[3].CoffeeOriginSection();
    return {
        root, map, shape, fill, borders, copy, title, titleTrack, slides, images, titles, slider, mask, markup, reads, metrics, observers,
        start: () => originRuntime.setupCoffeeOrigin(root), active: () => active, mapImage: () => mapImage,
        loadMap() { mapImage.onload?.(); }, failMap() { mapImage.onerror?.(); },
        move(value) { top = value; update?.(); },
        restore(value) { top = value; events.dispatchEvent(new Event("pageshow")); },
        resize(values) { Object.assign(metrics, values); for (const observer of observers) observer.callback(); },
        browserControls(height) { viewportHeight = height; events.dispatchEvent(new Event("resize")); },
        motion(value) { media.matches = value; media.dispatchEvent(new Event("change")); },
        fail() { failed = true; events.dispatchEvent(new Event("resize")); },
    };
}

function assertNative(story) {
    assert.equal(story.active(), false);
    assert.equal(story.root.attributes.has("data-origin-enhanced"), false);
    assert.equal(story.root.attributes.has("data-origin-map-ready"), false);
    assert.equal(story.root.attributes.has("data-origin-pin"), false);
    assert.equal(story.mask.hidden, true);
    assert.equal(story.slider.tabIndex, 0);
    for (const item of [...story.slides, ...story.images]) assert.equal(item.style.transform, undefined);
    assert.equal(story.title.style.opacity, undefined);
    assert.equal(story.copy.style.opacity, undefined);
}

function frame(story) {
    return [...story.slides, ...story.images].map(item => item.style.transform);
}

test("server HTML has one horizontal story and keeps the unready map hidden", () => {
    const story = mount(), html = renderToStaticMarkup(story.markup);
    assert.equal((html.match(/<article /g) ?? []).length, 3);
    assert.equal((html.match(/<img /g) ?? []).length, 3);
    for (const caption of ["Từ VƯỜN", "và THU HÁI", "đến PHƠI SẤY"]) assert(html.includes(caption));
    assert.match(html, /class="viewport"[^>]*tabindex="0"/);
    assert.match(html, /class="mapMask" hidden=""/);
    assert(!html.includes("data-origin-enhanced"));
    assert(!html.includes(">Lâm Đồng</p>"));
    assertNative(story);
});

test("restored positions render the same horizontal frame as scrolling there, before SVG loads", () => {
    for (const top of [400, -280, -1960, -3300]) {
        const restored = mount({ initialTop: top }), scrolled = mount();
        const cleanRestored = restored.start(), cleanScrolled = scrolled.start();
        scrolled.move(top);
        assert.equal(restored.active(), true);
        assert.equal(restored.root.attributes.has("data-origin-enhanced"), true);
        assert.equal(restored.mask.hidden, true);
        assert.deepEqual(frame(restored), frame(scrolled));
        const before = frame(restored);
        restored.loadMap();
        assert.deepEqual(frame(restored), before, "SVG arrival must not restart the horizontal timeline");
        cleanRestored(); cleanScrolled();
    }
});

test("a delayed SVG activates only the map at the current intro progress", () => {
    const story = mount();
    const cleanup = story.start();
    story.move(-280);
    assert.equal(story.shape.attributes.has("transform"), false);
    const before = frame(story);
    story.loadMap();
    assert.equal(story.mapImage().src, "/images/maps/south-vietnam-knockout.svg");
    assert.equal(story.mask.hidden, false);
    assert(story.shape.attributes.get("transform").startsWith("matrix("));
    assert.deepEqual(frame(story), before);
    assert.equal(story.copy.style.opacity, undefined);
    cleanup();
    assertNative(story);
});

test("SVG failure or an unavailable image loader cannot stop the horizontal story", () => {
    for (const imageFailure of [false, true]) {
        const story = mount({ imageFailure });
        const cleanup = story.start();
        if (!imageFailure) story.failMap();
        story.move(-1960);
        assert.equal(story.active(), true);
        assert.equal(story.slides[1].style.transform, "translateX(0%)");
        assert.equal(story.title.attributes.has("data-title-visible"), true);
        assert.equal(story.mask.hidden, true);
        cleanup();
    }
});

test("a map rendering error leaves the horizontal timeline running", () => {
    const story = mount();
    const cleanup = story.start();
    story.shape.setAttribute = () => { throw Error("map rendering failed"); };
    story.loadMap();
    assert.equal(story.root.attributes.has("data-origin-map-ready"), false);
    story.move(-1960);
    assert.equal(story.active(), true);
    assert.equal(story.slides[1].style.transform, "translateX(0%)");
    assert.equal(story.mask.hidden, true);
    cleanup();
});

test("map holds before zoom, restores the same frame on reload, and reverses without timers", () => {
    const story = mount({ initialTop: 0 });
    const cleanup = story.start();
    story.loadMap();
    const initial = story.shape.attributes.get("transform");
    story.move(-story.metrics.intro * 0.25);
    assert.equal(story.shape.attributes.get("transform"), initial);
    story.move(-story.metrics.intro * 0.5);
    const zoomed = story.shape.attributes.get("transform");
    assert.notEqual(zoomed, initial);
    story.restore(-story.metrics.intro * 0.5);
    assert.equal(story.shape.attributes.get("transform"), zoomed);
    story.move(-story.metrics.intro);
    assert.equal(story.mask.hidden, true);
    story.move(-story.metrics.intro * 0.1);
    assert.equal(story.shape.attributes.get("transform"), initial);
    cleanup();
});

test("completed map zoom sleeps during horizontal travel and resumes on reverse", () => {
    const story = mount();
    const cleanup = story.start();
    story.loadMap();
    const borders = story.borders.attributes.get("transform");
    story.move(-800);
    assert.equal(story.mask.hidden, true);
    const writes = story.shape.writes;
    story.move(-1600);
    assert.equal(story.shape.writes, writes);
    assert.equal(story.borders.attributes.get("transform"), borders);
    story.move(-200);
    assert.equal(story.mask.hidden, false);
    assert(story.shape.writes > writes);
    cleanup();
});

test("scroll reads section position once, caches geometry, and skips unchanged clamped frames", () => {
    const story = mount();
    const cleanup = story.start();
    const widthReads = story.reads.width, boundsReads = story.reads.bounds;
    for (let i = 0; i < 20; i++) story.move(-1800 - i * 10);
    assert.equal(story.reads.width, widthReads);
    assert.equal(story.reads.bounds, boundsReads + 20);
    story.move(-5000);
    const writes = [...story.slides, ...story.images, story.titleTrack].map(item => item.writes);
    story.move(-6000);
    assert.deepEqual([...story.slides, ...story.images, story.titleTrack].map(item => item.writes), writes);
    cleanup();
});

test("orientation/container changes remeasure geometry and browser chrome alone preserves progress", () => {
    const story = mount({ initialTop: -1960 });
    const cleanup = story.start();
    const before = frame(story);
    story.browserControls(920);
    assert.deepEqual(frame(story), before);
    story.resize({ width: 600, height: 920, intro: 736, story: 2760 });
    const reference = mount({ initialTop: -1960 });
    Object.assign(reference.metrics, story.metrics);
    const cleanupReference = reference.start();
    assert.deepEqual(frame(story), frame(reference));
    assert.equal(story.active(), true);
    cleanup(); cleanupReference();
});

test("pageshow restores progress without requiring another user scroll", () => {
    const story = mount();
    const cleanup = story.start();
    story.restore(-1960);
    assert.equal(story.slides[1].style.transform, "translateX(0%)");
    assert.equal(story.root.attributes.get("data-origin-pin"), "active");
    story.restore(100);
    assert.equal(story.root.attributes.get("data-origin-pin"), "before");
    cleanup();
});

test("a temporarily zero-sized stage resumes when its container becomes measurable", () => {
    const story = mount({ initialTop: -1960 });
    story.metrics.width = 0;
    const cleanup = story.start();
    assert.equal(story.active(), true);
    assert.equal(story.mask.hidden, true);
    story.loadMap();
    story.resize({ width: 1200 });
    assert.equal(story.slides[1].style.transform, "translateX(0%)");
    assert.equal(story.active(), true);
    cleanup();
});

test("reduced motion keeps horizontal navigation and removes map zoom and image parallax", () => {
    const story = mount({ reduced: true });
    const cleanup = story.start();
    story.loadMap();
    story.move(-1960);
    assert.equal(story.active(), true);
    assert.equal(story.mask.hidden, true);
    assert(story.images.every(image => image.style.transform === "translateX(0px) scale(1)"));
    assert.equal(story.slides[1].style.transform, "translateX(0%)");
    story.motion(false);
    assert(story.images[1].style.transform.includes("scale(1.2)"));
    story.move(-280);
    assert.equal(story.mask.hidden, false);
    cleanup();
});

test("timeline setup/measurement failures keep the native horizontal fallback accessible", () => {
    for (const options of [{ incompleteStory: true }, { initialFailure: true }]) {
        const story = mount(options);
        const cleanup = story.start();
        assertNative(story);
        cleanup();
    }
    const story = mount();
    story.start();
    story.move(-1960);
    story.fail();
    assertNative(story);
});

test("unmount releases observers and rejects queued asset, resize and restoration callbacks", () => {
    const story = mount();
    const cleanup = story.start();
    const load = story.mapImage().onload, error = story.mapImage().onerror;
    const resize = [...story.observers][0].callback;
    cleanup();
    assertNative(story);
    assert.equal(story.observers.size, 0);
    const writes = story.root.writes;
    load(); error(); resize();
    story.restore(-1960);
    story.motion(true);
    assert.equal(story.root.writes, writes);
    assertNative(story);
});
