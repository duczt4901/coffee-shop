import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const compiled = ts.transpileModule(readFileSync("src/components/ui/ImageReveal.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mount(reduced) {
    const refs = [];
    const exports = {};
    const classes = new Set();
    let setup, sync, revealCleanup, stopped = false;
    let top = 100;
    const root = {
        getBoundingClientRect: () => ({ top, height: 400 }),
        classList: {
            add: (...names) => names.forEach((name) => classes.add(name)),
            remove: (...names) => names.forEach((name) => classes.delete(name)),
            toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
        },
    };
    const style = { removeProperty(name) { delete this[name]; } };
    vm.runInNewContext(compiled, {
        exports,
        window: { scrollY: 0, innerHeight: 800 },
        document: { documentElement: { scrollHeight: 4000 } },
        require: (name) => {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return {
                useRef: (value) => { const ref = { current: value }; refs.push(ref); return ref; },
                useLayoutEffect: (effect) => { setup = effect; },
            };
            if (name.endsWith(".css")) return { root: "root", layer: "layer", animated: "animated", revealed: "revealed", inView: "in-view" };
            if (name.endsWith("scroll-viewport")) return { getScrollViewportHeight: () => 800 };
            if (name.endsWith("reveal")) return { isRevealVisible: () => true, revealStyle: {} };
            if (name.endsWith("native-motion")) return {
                observeMotion: (_query, start) => {
                    if (!reduced) revealCleanup = start();
                    return () => revealCleanup?.();
                },
                observeScroll: (update) => { sync = update; update(); return () => { stopped = true; }; },
            };
            throw new Error(`Unexpected dependency: ${name}`);
        },
    });
    exports.ImageReveal({ children: null, parallax: 80 });
    refs[0].current = root;
    refs[1].current = { style };
    const stop = setup();
    return { classes, style, stop, stopped: () => stopped, reduce: () => revealCleanup?.(), move(value) { top = value; sync(); } };
}

test("reduced motion keeps image parallax without clipping away image content", () => {
    const image = mount(true);
    const first = image.style.transform;
    assert(first.includes("scale(1.2)"));
    assert(!image.classes.has("animated"));
    image.move(200);
    assert.notEqual(image.style.transform, first);
    assert(!image.classes.has("animated"));
    image.stop();
    assert.equal(image.style.transform, undefined);
    assert.equal(image.stopped(), true);
});

test("turning off reveal animation preserves the independent parallax transform", () => {
    const image = mount(false);
    assert(image.classes.has("animated"));
    assert(image.classes.has("revealed"));
    const transform = image.style.transform;
    image.reduce();
    assert(!image.classes.has("animated"));
    assert(!image.classes.has("revealed"));
    assert.equal(image.style.transform, transform);
    image.stop();
});
