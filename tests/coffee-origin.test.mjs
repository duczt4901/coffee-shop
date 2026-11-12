import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const files = ["CoffeeProcessSlideshow", "CoffeeOriginSection"];
const compiled = files.map((file) => ts.transpileModule(readFileSync(`src/components/sections/home-page/${file}.tsx`, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText);

function element() {
    const attributes = new Map();
    return {
        attributes,
        style: { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } },
        setAttribute(name, value) { attributes.set(name, value); },
        removeAttribute(name) { attributes.delete(name); },
        toggleAttribute(name, value) { if (value) attributes.set(name, ""); else attributes.delete(name); },
    };
}

function mount({ initialFailure = false, incompleteStory = false, initialTop = 1200, stageHeight = 800 } = {}) {
    const root = element();
    const map = { ...element(), clientWidth: 1200, clientHeight: 800 };
    const shape = element(), fill = element(), borders = element(), copy = element(), location = element();
    const title = element(), titleTrack = element();
    const slides = Array.from({ length: 3 }, element), images = Array.from({ length: 3 }, element), titles = Array.from({ length: 3 }, element);
    const storyStart = { offsetTop: 560 };
    let top = initialTop, fail = initialFailure, active = false, effect, frame, stop, mapImage;
    const windowEvents = new EventTarget();
    let viewportHeight = 800;
    class MapImage {
        constructor() { mapImage = this; }
    }
    const track = { querySelectorAll: (selector) => selector === ".slide" ? slides : images };
    const photo = {
        get clientHeight() { if (fail) throw new Error("layout unavailable"); return stageHeight; },
        querySelector: (selector) => ({ ".slideTrack": incompleteStory ? null : track, ".viewport": { clientWidth: 1200 }, ".title": title })[selector],
        querySelectorAll: () => titles,
    };
    title.querySelector = () => titleTrack;
    root.querySelector = (selector) => ({
        ".introCopy": copy, ".locationLabel": location, ".map": map, "[data-origin-shape]": shape,
        "[data-origin-borders]": borders, ".provinceFill": fill, "[data-coffee-story-start]": storyStart, ".slideshow": photo,
    })[selector];
    root.querySelectorAll = () => [];
    root.getBoundingClientRect = () => ({ top, height: 4160 });
    const react = { useRef: () => ({ current: root }), useId: () => "origin-test", useLayoutEffect: (setup) => { effect = setup; } };
    let storyModule;
    const modules = compiled.map((code) => {
        const exports = {};
        vm.runInNewContext(code, {
            exports,
            Image: MapImage,
            window: {
                get innerHeight() { return viewportHeight; },
                matchMedia: () => ({ matches: false }),
                addEventListener: windowEvents.addEventListener.bind(windowEvents),
                removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
            },
            require: (name) => {
                if (name === "react/jsx-runtime") return jsxRuntime;
                if (name === "react") return react;
                if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
                if (name.endsWith("CoffeeProcessSlideshow")) return storyModule;
                if (name.endsWith("native-motion")) return {
                    observeScroll(update, onError) {
                        active = true;
                        stop = () => { active = false; };
                        frame = () => { if (active) { try { update(); } catch (error) { stop(); onError(error); } } };
                        try { update(); } catch (error) { stop(); throw error; }
                        return stop;
                    },
                };
                throw new Error(`Unexpected dependency: ${name}`);
            },
        });
        storyModule = exports;
        return exports;
    });
    const markup = modules[1].CoffeeOriginSection();
    return {
        root, map, shape, borders, copy, title, titleTrack, slides, images, titles, markup,
        start: () => effect(), active: () => active,
        loadMap() { mapImage.onload?.(); },
        failMap() { mapImage.onerror?.(); },
        mapImage: () => mapImage,
        move(value) { top = value; windowEvents.dispatchEvent(new Event("scroll")); frame?.(); },
        resizeViewport(height) { viewportHeight = height; windowEvents.dispatchEvent(new Event("resize")); frame?.(); },
        fail() { fail = true; frame(); },
    };
}

function assertBaseline(story) {
    assert.equal(story.root.attributes.has("data-origin-enhanced"), false);
    assert.equal(story.shape.attributes.has("transform"), false);
    assert.equal(story.copy.style.opacity, undefined);
    assert.equal(story.title.style.opacity, undefined);
    assert.equal(story.title.attributes.has("data-title-visible"), false);
    for (const item of [...story.slides, ...story.images]) assert.equal(item.style.transform, undefined);
    for (const title of story.titles) assert.equal(title.style.opacity, undefined);
}

test("origin HTML contains all three photos and captions without opting into the pinned experience", () => {
    const story = mount();
    const html = renderToStaticMarkup(story.markup);
    assert.equal((html.match(/<article /g) ?? []).length, 3);
    assert.equal((html.match(/<img /g) ?? []).length, 3);
    for (const caption of ["Từ VƯỜN", "và THU HÁI", "đến PHƠI SẤY"]) assert(html.includes(caption));
    assert(!html.includes("data-origin-enhanced"));
    assertBaseline(story);
});

test("map and slideshow activate together, retain scroll zoom and parallax, and clean up together", () => {
    const story = mount();
    const cleanup = story.start();
    assertBaseline(story);
    story.loadMap();
    assert.equal(story.root.attributes.has("data-origin-enhanced"), true);
    const initialMap = story.shape.attributes.get("transform");
    const initialBorders = story.borders.attributes.get("transform");
    story.move(-280);
    assert.notEqual(story.shape.attributes.get("transform"), initialMap);
    assert.equal(story.borders.attributes.get("transform"), initialBorders);
    assert.equal(story.slides[1].style.transform, "translateX(100%)");
    story.move(-1960);
    assert.equal(story.slides[1].style.transform, "translateX(0%)");
    assert(story.images[1].style.transform.includes("scale(1.2)"));
    assert.equal(story.title.attributes.has("data-title-visible"), true);
    cleanup();
    assert.equal(story.active(), false);
    assert.equal(story.map.attributes.get("viewBox"), "0 0 1540 1240");
    assertBaseline(story);
});

test("missing prerequisites and failed initial update leave the full baseline available", () => {
    for (const options of [{ incompleteStory: true }, { initialFailure: true }]) {
        const story = mount(options);
        const cleanup = story.start();
        story.loadMap();
        assertBaseline(story);
        assert.equal(story.active(), false);
        cleanup();
    }
});

test("slideshow uses its full stage and keeps horizontal progress when browser controls resize", () => {
    const story = mount({ stageHeight: 920 });
    const cleanup = story.start();
    story.loadMap();
    // One quarter of the 2680px travel, after the 560px map introduction.
    story.move(-1230);
    const transform = story.slides[1].style.transform;
    assert(Math.abs(parseFloat(transform.slice("translateX(".length)) - 59.52381) < 0.001);
    story.resizeViewport(920);
    assert.equal(story.slides[1].style.transform, transform);
    story.resizeViewport(740);
    assert.equal(story.slides[1].style.transform, transform);
    cleanup();
});

test("a later slideshow failure rolls back the map and every slide mutation", () => {
    const story = mount();
    story.start();
    story.loadMap();
    story.move(-1960);
    story.fail();
    assertBaseline(story);
    assert.equal(story.active(), false);
});

test("a failed SVG request never activates the opaque map mask or pinned story", () => {
    const story = mount();
    story.start();
    assert.equal(story.mapImage().src, "/images/maps/south-vietnam-knockout.svg");
    story.failMap();
    assertBaseline(story);
    assert.equal(story.active(), false);
});

test("SVG completion after unmount cannot activate the section", () => {
    const story = mount();
    const cleanup = story.start();
    const queuedLoad = story.mapImage().onload;
    cleanup();
    queuedLoad();
    assertBaseline(story);
    assert.equal(story.active(), false);
});

test("a late map never pins a baseline already visible or restored midway through the story", () => {
    for (const top of [400, -1200]) {
        const story = mount({ initialTop: top });
        story.start();
        story.loadMap();
        assertBaseline(story);
        assert.equal(story.active(), false);
    }
});

test("returning above an already viewed baseline does not allow a late map to change its layout", () => {
    const story = mount();
    story.start();
    story.move(400);
    story.move(1200);
    story.loadMap();
    assertBaseline(story);
    assert.equal(story.active(), false);
});
