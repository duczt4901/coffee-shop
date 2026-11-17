import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

const source = ts.transpileModule(readFileSync("src/components/experience/coffee-experience-runtime.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function classes() {
    const values = new Set();
    return { add: value => values.add(value), remove: (...names) => names.forEach(name => values.delete(name)),
        toggle(value, enabled) { if (enabled) values.add(value); else values.delete(value); }, has: value => values.has(value) };
}
function mount(reduced) {
    let closingTop = 800, effect, update, stopped = false, reverted = 0, index = 0;
    const media = Object.assign(new EventTarget(), { matches: reduced });
    const copies = [0, 1].map(() => ({ classList: classes(), parentElement: { getBoundingClientRect: () => ({ top: closingTop }) } }));
    const section = { classList: classes(), querySelectorAll: () => copies };
    const progress = [];
    const refs = [section, { getBoundingClientRect: () => ({ top: -500, height: 1800 }) }, { setProgress: value => progress.push(value) }];
    const exports = {};
    vm.runInNewContext(source, { exports, window: { matchMedia: () => media }, require(name) {
        if (name === "react/jsx-runtime") return jsxRuntime;
        if (name === "react") return { useRef: () => ({ current: refs[index++] }), useLayoutEffect(setup) { effect = setup; } };
        if (name.endsWith("native-motion")) return { observeScroll(sync) { update = sync; sync(); return () => { stopped = true; }; } };
        if (name.endsWith("split-words")) return { splitWords: () => ({ words: [], revert() { reverted++; } }) };
        if (name.endsWith("scroll-viewport")) return { getScrollViewportHeight: () => 800 };
        if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, key) => key }) };
        return {};
    } });
    section.querySelector = () => refs[1];
    const cleanup = exports.setupCoffeeExperience(section, { current: refs[2] });
    return { section, copies, media, progress, cleanup, stopped: () => stopped, reverted: () => reverted,
        scroll(top) { closingTop = top; update(); return copies.map(copy => [copy.classList.has("copyVisible"), copy.classList.has("copyAbove")]); } };
}

test("reduced motion keeps the same sticky copy sequence without rotating the model", () => {
    const normal = mount(false), reduced = mount(true);
    assert(normal.section.classList.has("animated"));
    assert(reduced.section.classList.has("animated"));
    for (const top of [800, 550, 470, 200, -100]) assert.deepEqual(reduced.scroll(top), normal.scroll(top));
    assert.equal(reduced.progress.length, 0);
    assert(normal.progress.length > 0);
    normal.cleanup();
    reduced.cleanup();
});

test("changing motion preference preserves sticky setup and releases listeners on unmount", () => {
    const scene = mount(false);
    scene.media.matches = true;
    scene.media.dispatchEvent(new Event("change"));
    assert.equal(scene.progress.at(-1), 0.5);
    const calls = scene.progress.length;
    scene.scroll(470);
    assert.equal(scene.progress.length, calls);
    assert(scene.section.classList.has("animated"));
    scene.cleanup();
    assert(scene.stopped());
    assert.equal(scene.reverted(), 2);
    assert(!scene.section.classList.has("animated"));
    const afterCleanup = scene.progress.length;
    scene.media.dispatchEvent(new Event("change"));
    assert.equal(scene.progress.length, afterCleanup);
});
