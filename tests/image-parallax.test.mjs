import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compile = (file) => ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const compiled = compile("src/components/ui/image-reveal-runtime.ts");
const nativeCompiled = compile("src/lib/native-motion.ts");

function mount(reduced) {
    const exports = {}, native = {};
    const classes = new Set(), updates = new Set(), changes = new Set();
    let top = 100, measurements = 0;
    const window = {
        scrollY: 0, innerHeight: 800,
        matchMedia: (query) => ({
            get matches() { return !query.includes("no-preference") || !reduced; },
            addEventListener: (_name, callback) => changes.add(callback),
            removeEventListener: (_name, callback) => changes.delete(callback),
        }),
    };
    vm.runInNewContext(nativeCompiled, { exports: native, window });
    const root = {
        getBoundingClientRect: () => { measurements++; return { top, height: 400 }; },
        classList: {
            add: (...names) => names.forEach((name) => classes.add(name)),
            remove: (...names) => names.forEach((name) => classes.delete(name)),
            toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
        },
    };
    const style = { removeProperty(name) { delete this[name]; } };
    root.querySelector = () => ({ style });
    vm.runInNewContext(compiled, {
        exports, window, document: { documentElement: { scrollHeight: 4000 } },
        require: (name) => {
            if (name.endsWith(".css")) return { default: { animated: "animated", revealed: "revealed", inView: "in-view" }, __esModule: true };
            if (name.endsWith("scroll-viewport")) return { getScrollViewportHeight: () => 800 };
            if (name.endsWith("reveal")) return { isRevealVisible: () => true };
            if (name.endsWith("native-motion")) return {
                observeMotion: native.observeMotion,
                observeScroll: (update) => { updates.add(update); update(); return () => updates.delete(update); },
            };
            throw new Error(`Unexpected dependency: ${name}`);
        },
    });
    const stop = exports.setupImageReveal(root, 80, { current: false });
    return {
        classes, style, stop, measurements: () => measurements, subscribers: () => updates.size, listeners: () => changes.size,
        motion(next) { reduced = next; changes.forEach((change) => change()); },
        move(value) { top = value; updates.forEach((update) => update()); },
    };
}

test("reduced motion keeps the full image static without scroll measurements", () => {
    const image = mount(true);
    assert.equal(image.style.transform, undefined);
    assert.equal(image.classes.size, 0);
    assert.equal(image.subscribers(), 0);
    image.move(200);
    assert.equal(image.measurements(), 0);
    image.stop();
    assert.equal(image.listeners(), 0);
});

test("normal motion preserves parallax, reveals and offscreen cleanup", () => {
    const image = mount(false);
    assert.match(image.style.transform, /scale\(1\.2\)$/);
    assert(image.classes.has("animated"));
    assert(image.classes.has("revealed"));
    const first = image.style.transform;
    image.move(200);
    assert.notEqual(image.style.transform, first);
    image.move(1000);
    assert.equal(image.style.transform, undefined);
    image.stop();
    assert.equal(image.subscribers(), 0);
    assert.equal(image.classes.size, 0);
});

test("changing motion preference stops transforms immediately and restores only normal motion", () => {
    const image = mount(false);
    image.motion(true);
    assert.equal(image.style.transform, undefined);
    assert.equal(image.classes.size, 0);
    assert.equal(image.subscribers(), 0);
    const reads = image.measurements();
    image.move(200);
    assert.equal(image.measurements(), reads);
    image.motion(false);
    assert.match(image.style.transform, /scale\(1\.2\)$/);
    assert.equal(image.subscribers(), 1);
    assert(!image.classes.has("animated"), "already revealed content must not be clipped again");
    image.stop();
    assert.equal(image.listeners(), 0);
    assert.equal(image.subscribers(), 0);
});
