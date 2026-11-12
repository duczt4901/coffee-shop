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

function mount({ fail = false, offscreen = false, supported = true, footer = false, footerTop = 900, targetTop = offscreen ? 900 : 100, atPageEnd = false } = {}) {
    let effect, ref, focus, sync;
    const animations = [];
    let reverts = 0;
    class FakeNode {}
    const summary = new FakeNode();
    summary.contains = node => node === summary;
    const scope = {
        animate: supported ? () => {} : undefined,
        closest: () => footer ? { getBoundingClientRect: () => ({ top: footerTop, bottom: footerTop + 1000 }) } : null,
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
        getBoundingClientRect: () => ({ top: targetTop, height: 40 }),
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
        window: { scrollY: atPageEnd ? 4200 : 0, innerHeight: 800 }, document: { documentElement: { scrollHeight: 5000 } },
        require(name) {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return { useRef() { ref = { current: scope }; return ref; }, useLayoutEffect(callback) { effect = callback; } };
            if (name === "next/navigation") return { usePathname: () => "/" };
            if (name.endsWith("/reveal")) return preset;
            if (name.endsWith("scroll-viewport")) return { getScrollViewportHeight: () => 800 };
            if (name.endsWith("split-words")) return { splitWords: target => ({ words: [target], revert() { reverts++; } }) };
            if (name.endsWith("native-motion")) return { observeMotion: (_query, setup) => setup(), observeScroll: update => { sync = update; update(); return () => {}; } };
            if (name === "lenis/react" || name.endsWith(".css") || ["next/link", "./Button", "./LinkMarker"].includes(name)) return {};
            throw Error(name);
        },
    });
    exports.EditorialReveal({ children: null });
    const cleanup = effect();
    return { targets, animations, cleanup, reverts: () => reverts, focusSummary: () => focus({ target: summary }), ref,
        scrollFooter(top) { footerTop = top; sync(); } };
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

test("footer text waits until its clipping boundary is actually in view", () => {
    const reveal = mount({ footer: true, footerTop: 750, targetTop: 700 });
    assert.equal(reveal.animations.length, 0, "text behind the footer mask must not reveal early");
    assert(reveal.targets.every(target => target.pending));
    reveal.scrollFooter(710);
    assert.equal(reveal.animations.length, 2);
    assert(reveal.targets.every(target => !target.pending));
    reveal.scrollFooter(600);
    assert.equal(reveal.animations.length, 2, "each text reveals only once");
    reveal.cleanup();
});

test("page-end fallback reveals visible footer text but never text behind its clip", () => {
    const clipped = mount({ footer: true, footerTop: 810, targetTop: 760, atPageEnd: true });
    assert.equal(clipped.animations.length, 0);
    clipped.scrollFooter(740);
    assert.equal(clipped.animations.length, 2);
    clipped.cleanup();
});
