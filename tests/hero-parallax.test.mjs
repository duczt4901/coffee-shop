import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const compiled = ts.transpileModule(readFileSync("src/components/layout/ImmersivePage.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mount(supported) {
    const refs = [];
    const exports = {};
    let setup, sync, cleaned = false;
    let top = -200;
    const style = { removeProperty(name) { delete this[name]; } };
    vm.runInNewContext(compiled, {
        exports,
        CSS: { supports: () => supported },
        require: (name) => {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return {
                useRef: () => { const ref = { current: null }; refs.push(ref); return ref; },
                useLayoutEffect: (effect) => { setup = effect; },
            };
            if (name.endsWith(".css")) return {};
            if (name.endsWith("scroll-viewport")) return { getScrollViewportHeight: () => 800 };
            if (name.endsWith("native-motion")) return {
                observeMotion: (query, start) => {
                    assert(query.includes("min-width"));
                    return start();
                },
                observeScroll: (update) => { sync = update; update(); return () => { cleaned = true; }; },
            };
            throw new Error(`Unexpected dependency: ${name}`);
        },
    });
    exports.ImmersivePage({ backdrop: null, children: null });
    refs[0].current = { getBoundingClientRect: () => ({ top }) };
    refs[1].current = { style };
    const stop = setup();
    return { style, stop, cleaned: () => cleaned, move(value) { top = value; sync(); } };
}

test("hero parallax falls back to shared scroll updates and releases its transform", () => {
    const hero = mount(false);
    assert.equal(hero.style.transform, "translate3d(0, 32px, 0)");
    hero.move(-2000);
    assert.equal(hero.style.transform, "translate3d(0, 128px, 0)");
    hero.move(100);
    assert.equal(hero.style.transform, "translate3d(0, 0px, 0)");
    hero.stop();
    assert.equal(hero.style.transform, undefined);
    assert.equal(hero.cleaned(), true);
});

test("native timelines do not start a redundant parallax handler", () => {
    const hero = mount(true);
    assert.equal(hero.style.transform, undefined);
    assert.equal(hero.stop, undefined);
});
