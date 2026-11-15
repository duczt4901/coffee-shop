import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const source = ts.transpileModule(readFileSync("src/components/experience/coffee-bag/LocalCoffeeModel.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));

function mount({ observer = true, fallback = false } = {}) {
    let effect, handle, entered, changed, resolve, reject, imports = 0, created = 0, disposed = 0;
    const refs = [], progress = [];
    const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
    const container = { dataset: {} }, frame = {};
    const root = { dataset: fallback ? { coffeeFallback: "true" } : {} };
    const exports = {};
    vm.runInNewContext(source, {
        exports, console: { error() {} },
        document: { documentElement: root },
        MutationObserver: class {
            constructor(callback) { changed = callback; }
            observe() {} disconnect() {}
        },
        ...(observer ? { IntersectionObserver: class {
            constructor(callback) { entered = callback; }
            observe() {} disconnect() {}
        } } : {}),
        require(name) {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return {
                useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
                useEffect(setup) { effect = setup; },
                useImperativeHandle(_ref, create) { handle = create(); },
            };
            if (name.endsWith("coffee-model-runtime")) { imports++; return pending; }
            if (name.endsWith(".css")) return { default: {} };
            throw Error(`Eager dependency: ${name}`);
        },
    });
    exports.LocalCoffeeModel({ ref: null });
    refs[0].current = container;
    refs[1].current = frame;
    const cleanup = effect();
    return {
        container, progress, handle, cleanup,
        enter(ratio = 1) { entered([{ intersectionRatio: ratio }]); },
        load() { resolve({ createCoffeeModel(actualContainer, actualFrame, initial) {
            assert.equal(actualContainer, container);
            assert.equal(actualFrame, frame);
            created++;
            progress.push(initial);
            return { setProgress(value) { progress.push(value); }, dispose() { disposed++; } };
        } }); },
        reject: () => reject(Error("module unavailable")),
        disable() { root.dataset.coffeeFallback = "true"; changed?.(); },
        counts: () => ({ imports, created, disposed }),
    };
}

test("offscreen model keeps the poster and imports Three.js only when visible", async () => {
    const model = mount();
    await flush();
    assert.equal(model.counts().imports, 0);
    model.enter(0);
    await flush();
    assert.equal(model.counts().imports, 0);
    model.handle.setProgress(0.8);
    model.enter();
    model.enter();
    await flush();
    assert.equal(model.counts().imports, 1);
    model.load();
    await flush();
    assert.deepEqual(model.progress, [0.8], "restored scroll progress survives the delayed import");
    model.handle.setProgress(0.9);
    assert.deepEqual(model.progress, [0.8, 0.9]);
    model.cleanup();
    assert.equal(model.counts().disposed, 1);
});

test("placeholder policy skips imports, rejects late WebGL setup and disposes an active model", async () => {
    const skipped = mount({ fallback: true });
    await flush();
    assert.equal(skipped.counts().imports, 0);
    assert.equal(skipped.container.dataset.coffeeState, "fallback");
    const late = mount();
    late.enter();
    await flush();
    late.disable();
    late.load();
    await flush();
    assert.equal(late.counts().created, 0);
    assert.equal(late.container.dataset.coffeeState, "fallback");
    late.cleanup();
    const active = mount();
    active.enter();
    active.load();
    await flush();
    active.disable();
    assert.equal(active.counts().disposed, 1);
    assert.equal(active.container.dataset.coffeeState, "fallback");
    active.cleanup();
    assert.equal(active.counts().disposed, 1);
});

test("unmount rejects late initialization and import failure keeps the poster", async () => {
    const late = mount();
    late.enter();
    await flush();
    late.cleanup();
    late.load();
    await flush();
    assert.equal(late.counts().created, 0);
    const failed = mount();
    failed.enter();
    await flush();
    failed.reject();
    await flush();
    assert.equal(failed.container.dataset.coffeeState, "error");
    failed.cleanup();
});

test("browsers without IntersectionObserver can still start the model", async () => {
    const model = mount({ observer: false });
    model.load();
    await flush();
    assert.equal(model.counts().created, 1);
    model.cleanup();
});
