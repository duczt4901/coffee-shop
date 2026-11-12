import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const source = ts.transpileModule(readFileSync("src/providers/TransitionProvider.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mount({ reduced = false, throwAt = -1 } = {}) {
    const refs = [];
    const animations = [];
    let calls = 0;
    const node = () => ({
        style: {}, classList: { add() {}, remove() {} },
        animate(_frames, timing) {
            if (calls++ === throwAt) throw Error("WAAPI unavailable");
            let resolve, reject;
            const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
            const animation = { timing, finished, resolve, reject, cancelled: false, cancel() { this.cancelled = true; reject(Error("cancelled")); } };
            animations.push(animation);
            return animation;
        },
    });
    const exports = {};
    vm.runInNewContext(source, {
        exports, console: { error() {} }, window: { matchMedia: () => ({ matches: reduced }) },
        require(name) {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return { useEffect() {}, useRef(value) { const ref = { current: value }; refs.push(ref); return ref; } };
            if (name === "next-transition-router") return { TransitionRouter: () => null };
            if (name.endsWith(".css")) return {};
            throw Error(name);
        },
    });
    const router = exports.default({ children: null });
    refs[0].current = Array.from({ length: 4 }, node);
    refs[1].current = node();
    refs[2].current = Array.from({ length: 4 }, node);
    return { ...router.props, animations, panels: refs[0].current };
}

test("partial transition setup failure clears the overlay and continues once", async () => {
    const transition = mount({ throwAt: 1 });
    let navigations = 0;
    transition.leave(() => navigations++);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(navigations, 1);
    assert(transition.panels.every(panel => panel.style.transform === "scaleX(0)"));
    assert(transition.animations.every(animation => animation.cancelled));
});

test("rejected animation continues navigation, but explicit cancellation does not", async () => {
    for (const cancelled of [false, true]) {
        const transition = mount();
        let navigations = 0;
        const stop = transition.leave(() => navigations++);
        if (cancelled) stop();
        else transition.animations[0].reject(Error("rendering failed"));
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(navigations, cancelled ? 0 : 1);
    }
});

test("successful transitions retain timing and advance once after all animations", async () => {
    const transition = mount();
    let navigations = 0;
    transition.leave(() => navigations++);
    assert.equal(transition.animations[0].timing.duration, 700);
    assert.equal(transition.animations[1].timing.delay, 75);
    transition.animations.forEach(animation => animation.resolve());
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(navigations, 1);
});

test("reduced motion navigates without allocating animations", () => {
    const transition = mount({ reduced: true });
    let navigations = 0;
    transition.leave(() => navigations++);
    assert.equal(navigations, 1);
    assert.equal(transition.animations.length, 0);
});
