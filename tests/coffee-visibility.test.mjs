import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const source = ts.transpileModule(readFileSync("src/components/experience/coffee-bag/LocalCoffeeModel.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function mount() {
    let effect, handle, intersect, setupError, active = false;
    let top = 100;
    const refs = [];
    const events = Object.assign(new EventTarget(), { innerHeight: 800, innerWidth: 390 });
    const document = Object.assign(new EventTarget(), { hidden: false });
    const domElement = Object.assign(new EventTarget(), { setAttribute() {}, remove() {} });
    const forever = new Promise(() => {});
    const exports = {};
    vm.runInNewContext(source, {
        exports, window: events, document, AbortController, console: { error(_message, error) { setupError = error; } },
        requestAnimationFrame: () => 1, cancelAnimationFrame() {},
        IntersectionObserver: class { constructor(callback) { intersect = callback; } observe() {} disconnect() {} },
        ResizeObserver: class { observe() {} disconnect() {} },
        require(name) {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return {
                useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
                useEffect(setup) { effect = setup; }, useImperativeHandle(_ref, create) { handle = create(); },
            };
            if (name === "three") return {
                Scene: class {}, PerspectiveCamera: class {}, Vector3: class {},
                WebGLRenderer: class {
                    domElement = domElement; shadowMap = {};
                    setClearColor() {} dispose() {} forceContextLoss() {}
                },
                MathUtils: { clamp: (value, min, max) => Math.max(min, Math.min(max, value)) },
            };
            if (name.endsWith("GLTFLoader.js")) return { GLTFLoader: class { loadAsync() { return forever; } } };
            if (name.endsWith("coffee-resources")) return { createCoffeeResources: () => ({ dispose() {} }) };
            if (name.endsWith("coffee-render-loop")) return { createCoffeeRenderLoop: () => ({ setActive(value) { active = value; }, invalidate() {}, dispose() {} }) };
            if (name.endsWith("coffee-bean-atlas")) return { loadCoffeeBeanAtlas: () => forever };
            if (name.endsWith("coffee-asset-wait")) return { waitForCoffeeAsset: promise => promise };
            if (name.endsWith(".json")) return { default: { imageSHA256: "test" } };
            if (name.endsWith(".module.css")) return { default: {} };
            return {};
        },
    });
    exports.LocalCoffeeModel({ ref: null });
    refs[0].current = { dataset: {}, clientWidth: 390 };
    refs[1].current = { appendChild() {}, getBoundingClientRect: () => ({ top, bottom: top + 800, left: 0, right: 390, height: 800 }) };
    const cleanup = effect();
    if (setupError) throw setupError;
    return { active: () => active, cleanup,
        bounds(value) { top = value; },
        observer(visible) { intersect([{ isIntersecting: visible, intersectionRect: { width: visible ? 390 : 0, height: visible ? 800 : 0 } }]); },
        scroll(progress) { handle.setProgress(progress); },
        hide(value) { document.hidden = value; document.dispatchEvent(new Event("visibilitychange")); } };
}

test("3D activity uses current bounds even when intersection notifications are stale", () => {
    const model = mount();
    model.observer(false);
    assert.equal(model.active(), true, "a stale offscreen notification cannot suspend a visible model");
    model.bounds(900);
    model.observer(true);
    assert.equal(model.active(), false, "a stale visible notification cannot keep an offscreen model running");
    model.bounds(100);
    model.scroll(0.6);
    assert.equal(model.active(), true, "scroll wakes the renderer without waiting for re-entry");
    model.cleanup();
});

test("unchanged camera progress and tab restoration still reconcile renderer visibility", () => {
    const model = mount();
    model.bounds(900);
    model.scroll(0.5);
    assert.equal(model.active(), false);
    model.bounds(100);
    model.scroll(0.5);
    assert.equal(model.active(), true);
    model.hide(true);
    assert.equal(model.active(), false);
    model.hide(false);
    assert.equal(model.active(), true);
    model.cleanup();
});
