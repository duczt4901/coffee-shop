import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const compiled = ts.transpileModule(readFileSync("src/components/layout/PageScrollbar.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mountScrollbar(failure, lenis) {
    let setup, resize, disconnected = 0, geometryReads = 0, heightWrites = 0;
    let pageHeight = 2000, viewport = 800;
    const attributes = new Map();
    const track = { hidden: true, setAttribute: (key, value) => attributes.set(key, value) };
    const thumb = { style: {} };
    Object.defineProperty(thumb.style, "height", {
        get() { return this.value; },
        set(value) { heightWrites++; this.value = value; },
    });
    const root = {
        get scrollHeight() { geometryReads++; return pageHeight; },
        setAttribute: (key, value) => attributes.set(key, value),
        removeAttribute: (key) => attributes.delete(key),
    };
    const window = new EventTarget();
    Object.defineProperty(window, "innerHeight", { get: () => viewport });
    window.scrollY = 0;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports, window, document: { body: {}, documentElement: root },
        getComputedStyle: () => ({ overflowY: "auto" }),
        ResizeObserver: failure === "unsupported" ? undefined : class {
            constructor(callback) {
                if (failure === "constructor") throw new Error("observer unavailable");
                resize = callback;
            }
            observe() { if (failure === "observe") throw new Error("observation failed"); }
            disconnect() { disconnected++; }
        },
        require: (name) => {
            if (name === "@/lib/smooth-scroll") return { getSmoothScroll: () => lenis };
            if (name === "react") return { useRef: () => ({ current: null }), useLayoutEffect: (effect) => { setup = effect; } };
            if (name.endsWith(".css")) return {};
            if (name === "react/jsx-runtime") return jsxRuntime;
            throw new Error(`Unexpected component dependency: ${name}`);
        },
    });
    const element = exports.PageScrollbar();
    element.props.ref.current = track;
    element.props.children.props.ref.current = thumb;
    const cleanup = setup();
    return {
        track, thumb, attributes, cleanup,
        scroll(top) { window.scrollY = top; window.dispatchEvent(new Event("scroll")); },
        resize(height, size) { pageHeight = height; viewport = size; resize(); },
        stats: () => ({ disconnected, geometryReads, heightWrites }),
        key(key) { element.props.onKeyDown({ key, preventDefault() {} }); },
    };
}

test("scrollbar keyboard input resets Lenis inertia at the requested position", () => {
    const calls = [];
    const bar = mountScrollbar(undefined, { scrollTo: (top, options) => calls.push([top, { ...options }]) });
    bar.key("End");
    bar.key("Home");
    assert.deepEqual(calls, [[1200, { immediate: true }], [0, { immediate: true }]]);
    bar.cleanup();
});

test("custom scrollbar opts in after setup, caches geometry, and follows dynamic layout", () => {
    const bar = mountScrollbar();
    assert.equal(bar.attributes.has("data-custom-scrollbar"), true);
    assert.equal(bar.track.hidden, false);
    assert.equal(bar.thumb.style.height, "320px");
    for (let index = 0; index < 100; index++) bar.scroll(600);
    assert.equal(bar.attributes.get("aria-valuenow"), "50");
    assert.equal(bar.thumb.style.transform, "translateY(240px)");
    assert.deepEqual(bar.stats(), { disconnected: 0, geometryReads: 1, heightWrites: 1 });
    bar.resize(2400, 600);
    assert.equal(bar.thumb.style.height, "150px");
    assert.equal(bar.attributes.get("aria-valuenow"), "33");
    bar.cleanup();
    assert.equal(bar.attributes.has("data-custom-scrollbar"), false);
    assert.equal(bar.track.hidden, true);
    const before = bar.stats();
    bar.scroll(900);
    assert.deepEqual(bar.stats(), before, "cleanup must remove the scroll listener");
    assert.equal(before.disconnected, 1);
});

for (const failure of ["unsupported", "constructor", "observe"]) {
    test(`native scrollbar remains available when initialization fails: ${failure}`, () => {
        const bar = mountScrollbar(failure);
        assert.equal(bar.attributes.has("data-custom-scrollbar"), false);
        assert.equal(bar.track.hidden, true);
        assert.equal(bar.stats().geometryReads, 0);
        bar.cleanup?.();
    });
}
