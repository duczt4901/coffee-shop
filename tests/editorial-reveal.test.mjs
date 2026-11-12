import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { importTypeScript } from "../scripts/lib/import-typescript.mjs";

const preset = await importTypeScript(new URL("../src/lib/reveal.ts", import.meta.url));
const source = ts.transpileModule(readFileSync("src/components/ui/EditorialReveal.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mount({ fail = false, offscreen = false, supported = true } = {}) {
    let effect, ref, focus;
    const animations = [];
    let reverts = 0;
    class FakeNode {}
    const summary = new FakeNode();
    summary.contains = node => node === summary;
    const scope = {
        animate: supported ? () => {} : undefined,
        querySelectorAll: () => targets,
        addEventListener: (_name, callback) => { focus = callback; },
        removeEventListener: () => { focus = undefined; },
    };
    const targets = [true, false].map(heading => ({
        dataset: { reveal: heading ? "words" : "lines" },
        pending: false,
        setAttribute() { this.pending = true; },
        removeAttribute() { this.pending = false; },
        closest(selector) {
            if (selector === "[data-editorial-reveal]") return scope;
            if (selector.includes("summary")) return summary;
            return heading ? {} : null;
        },
        querySelector: () => null,
        contains: () => false,
        getBoundingClientRect: () => ({ top: offscreen ? 900 : 100, height: 40 }),
        animate(_frames, options) {
            if (fail && !heading) throw Error("animation failed");
            const animation = { options, cancelled: false, cancel() { this.cancelled = true; } };
            animations.push(animation);
            return animation;
        },
    }));
    const exports = {};
    vm.runInNewContext(source, {
        exports, Node: FakeNode, console: { error() {} },
        window: { scrollY: 0, innerHeight: 800 }, document: { documentElement: { scrollHeight: 5000 } },
        require(name) {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return { useRef() { ref = { current: scope }; return ref; }, useLayoutEffect(callback) { effect = callback; } };
            if (name === "next/navigation") return { usePathname: () => "/" };
            if (name.endsWith("/reveal")) return preset;
            if (name.endsWith("scroll-viewport")) return { getScrollViewportHeight: () => 800 };
            if (name.endsWith("split-words")) return { splitWords: target => ({ words: [target], revert() { reverts++; } }) };
            if (name.endsWith("native-motion")) return { observeMotion: (_query, setup) => setup(), observeScroll: update => { update(); return () => {}; } };
            if (name === "lenis/react" || name.endsWith(".css") || ["next/link", "./Button", "./LinkMarker"].includes(name)) return {};
            throw Error(name);
        },
    });
    exports.EditorialReveal({ children: null });
    const cleanup = effect();
    return { targets, animations, cleanup, reverts: () => reverts, focusSummary: () => focus({ target: summary }), ref };
}

test("partial reveal failure cancels completed setup and restores every target", () => {
    const reveal = mount({ fail: true });
    assert(reveal.targets.every(target => !target.pending));
    assert(reveal.animations.every(animation => animation.cancelled));
    assert.equal(reveal.reverts(), 1);
});

test("keyboard focus reveals pending native summary content without body delay", () => {
    const reveal = mount({ offscreen: true });
    assert(reveal.targets.every(target => target.pending));
    reveal.focusSummary();
    assert(reveal.targets.every(target => !target.pending));
    assert(reveal.animations.every(animation => animation.options.delay === 0));
    reveal.cleanup();
});

test("unsupported animation API leaves the HTML visible without enhancement", () => {
    const reveal = mount({ supported: false });
    assert.equal(reveal.cleanup, undefined);
    assert(reveal.targets.every(target => !target.pending));
});
