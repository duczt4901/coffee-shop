import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const compiled = ts.transpileModule(readFileSync("src/components/layout/ImmersivePage.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mount(motion = true) {
    const refs = [];
    const exports = {};
    let setup, sync, cleaned = false;
    let top = -200;
    const style = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } };
    vm.runInNewContext(compiled, {
        exports,
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
                    assert.equal(query, "(prefers-reduced-motion: no-preference)");
                    return motion ? start() : undefined;
                },
                observeScroll: (update) => { sync = update; update(); return () => { cleaned = true; }; },
            };
            throw new Error(`Unexpected dependency: ${name}`);
        },
    });
    exports.ImmersivePage({ backdrop: null, children: null });
    refs[0].current = { style, getBoundingClientRect: () => ({ top }) };
    const stop = setup();
    return { style, stop, cleaned: () => cleaned, move(value) { top = value; sync(); } };
}

test("hero supplies a clamped 50% scroll offset to its media and releases it", () => {
    const hero = mount();
    assert.equal(hero.style["--hero-parallax"], "100px");
    hero.move(-2000);
    assert.equal(hero.style["--hero-parallax"], "400px");
    hero.move(100);
    assert.equal(hero.style["--hero-parallax"], "0px");
    hero.stop();
    assert.equal(hero.style["--hero-parallax"], undefined);
    assert.equal(hero.cleaned(), true);
});

test("reduced motion keeps hero media static", () => {
    const hero = mount(false);
    assert.equal(hero.style["--hero-parallax"], undefined);
    assert.equal(hero.stop, undefined);
});
