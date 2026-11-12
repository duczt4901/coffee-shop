import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const source = ts.transpileModule(readFileSync("src/providers/TransitionProvider.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));

function mount({ reduced = false, fail = false } = {}) {
    const refs = [], animations = [];
    let path = "/", booted = false, refIndex = 0;
    const cover = {
        animate(frames, timing) {
            if (fail) throw Error("Animation API failed");
            let resolve, reject;
            const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
            const animation = { frames, timing, finished, resolve, reject, cancelled: false, cancel() { this.cancelled = true; reject(Error("cancelled")); } };
            animations.push(animation);
            return animation;
        },
    };
    const exports = {};
    vm.runInNewContext(source, {
        exports, window: { matchMedia: () => ({ matches: reduced }) },
        require(name) {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return {
                useEffect() {}, useCallback: fn => fn,
                useState: () => [booted, value => { booted = value; }],
                useRef(value) { return refs[refIndex++] ??= { current: value }; },
            };
            if (name === "next-transition-router") return { TransitionRouter: () => null };
            if (name === "next/navigation") return { usePathname: () => path };
            if (name.endsWith("PageReveal")) return { PageReveal: () => null };
            if (name.endsWith(".css")) return {};
            throw Error(name);
        },
    });
    const render = (nextPath = path) => {
        path = nextPath;
        refIndex = 0;
        const router = exports.default({ children: null });
        refs[0].current = cover;
        return { ...router.props, reveal: router.props.children[1] };
    };
    return { ...render(), render, animations };
}

test("failed route cover continues navigation", () => {
    const transition = mount({ fail: true });
    let navigations = 0;
    transition.leave(() => navigations++);
    assert.equal(navigations, 1);
});

test("rejected cover continues once, but explicit cancellation does not navigate", async () => {
    for (const cancelled of [false, true]) {
        const transition = mount();
        let navigations = 0;
        const stop = transition.leave(() => navigations++);
        if (cancelled) stop();
        else transition.animations[0].reject(Error("rendering failed"));
        await flush();
        assert.equal(navigations, cancelled ? 0 : 1);
    }
});

test("leave fades the cover before navigation and enter releases the route immediately", async () => {
    const transition = mount();
    let navigations = 0, enters = 0;
    const stop = transition.leave(() => navigations++);
    assert.equal(navigations, 0);
    assert.equal(transition.animations[0].timing.duration, 250);
    assert.equal(transition.animations[0].frames[1].opacity, 1);
    transition.animations[0].resolve();
    await flush();
    assert.equal(navigations, 1);
    stop();
    transition.enter(() => enters++);
    assert.equal(enters, 1);
    assert.equal(transition.animations[0].cancelled, true);
});

test("each pathname including variants and back navigation mounts a fresh reveal", () => {
    const transition = mount();
    assert.equal(transition.reveal.key, "/");
    assert.equal(transition.reveal.props.initial, true);
    transition.reveal.props.onReady();
    for (const path of ["/san-pham/", "/san-pham/robusta/", "/san-pham/robusta-500g/", "/san-pham/robusta/", "/"]) {
        const route = transition.render(path);
        assert.equal(route.reveal.key, path);
        assert.equal(route.reveal.props.initial, false);
    }
});

test("reduced motion keeps a brief opacity transition", () => {
    const transition = mount({ reduced: true });
    transition.leave(() => {});
    assert.equal(transition.animations[0].timing.duration, 80);
});
