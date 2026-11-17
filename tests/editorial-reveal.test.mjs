import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { importTypeScript } from "../scripts/lib/import-typescript.mjs";

const preset = await importTypeScript(new URL("../src/lib/reveal.ts", import.meta.url));
const source = ts.transpileModule(readFileSync("src/components/ui/editorial-reveal-runtime.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mount({ fail = false, offscreen = false, supported = true, footer = false, footerTop = 900, targetTop = offscreen ? 900 : 100, atPageEnd = false, pageHeading = false, covered = false, entryOwned = false, steps, modes } = {}) {
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
    const targets = (steps ?? [undefined, undefined]).map((step, index) => {
        const heading = index === 0 && !modes;
        return {
            dataset: { reveal: modes?.[index] ?? (heading ? "words" : "lines") },
            pending: false,
            setAttribute() { this.pending = true; },
            removeAttribute() { this.pending = false; },
            closest(selector) {
                if (selector === "[data-editorial-reveal]") return scope;
                if (selector === "[data-reveal-step]") return step === undefined ? null : { dataset: { revealStep: String(step) } };
                if (selector === "h1") return heading && pageHeading ? {} : null;
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
        };
    });
    const exports = {};
    const events = Object.assign(new EventTarget(), { scrollY: atPageEnd ? 4200 : 0, innerHeight: 800 });
    events.__lavuonReveal = { ownsEntry: () => entryOwned };
    const root = { scrollHeight: 5000, dataset: { revealActive: String(covered) } };
    vm.runInNewContext(source, {
        exports, Node: FakeNode, console: { error() {} },
        window: events, document: { documentElement: root, querySelector: () => null },
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
    const cleanup = exports.setupEditorialReveal(scope);
    return { targets, animations, cleanup, reverts: () => reverts, focusSummary: () => focus({ target: summary }), ref,
        endReveal() { root.dataset.revealActive = "false"; events.dispatchEvent(new Event("lavuon:reveal-done")); },
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

test("an unclaimed heading uses editorial reveal, including when the entry controller is unavailable", () => {
    const reveal = mount({ pageHeading: true });
    assert.equal(reveal.targets[0].pending, false);
    assert.equal(reveal.animations.length, 2);
    assert.equal(reveal.reverts(), 0);
    reveal.cleanup();
});

test("editorial motion prepares under the cover but starts only when page reveal finishes", () => {
    const reveal = mount({ covered: true });
    assert.equal(reveal.animations.length, 0);
    assert(reveal.targets.every(target => target.pending));
    reveal.endReveal();
    assert.equal(reveal.animations.length, 2);
    assert(reveal.targets.every(target => !target.pending));
    reveal.cleanup();
    reveal.endReveal();
    assert.equal(reveal.animations.length, 2);
});

test("arrival-owned content has no editorial masks or second animation, even with late hydration", () => {
    for (const covered of [true, false]) {
        const reveal = mount({ covered, entryOwned: true });
        assert(reveal.targets.every(target => !target.pending));
        assert.equal(reveal.animations.length, 0);
        reveal.endReveal();
        assert.equal(reveal.animations.length, 0);
        assert.equal(reveal.reverts(), 0);
        reveal.cleanup();
    }
});

test("explicit steps synchronize each table row and keep all five rows staggered", () => {
    const steps = Array.from({ length: 5 }, (_, index) => [index, index, index]).flat();
    const modes = steps.map((_, index) => index % 3 === 2 ? "border" : "lines");
    const reveal = mount({ steps, modes });
    assert.equal(reveal.animations.length, 15);
    for (let row = 0; row < 5; row++) {
        const delays = reveal.animations.slice(row * 3, row * 3 + 3).map(animation => animation.options.delay);
        assert.deepEqual(delays, [row * 180 + 120, row * 180 + 120, row * 180]);
    }
    reveal.cleanup();
});

test("separate groups restart their own sequence instead of waiting for previous content", () => {
    const reveal = mount({ steps: [0, 1, 2, 0, 1] });
    assert.deepEqual(reveal.animations.map(animation => animation.options.delay), [0, 300, 480, 120, 300]);
    reveal.cleanup();
});

test("keyboard focus skips an explicit sequence delay", () => {
    const reveal = mount({ offscreen: true, steps: [4, 5] });
    reveal.focusSummary();
    assert(reveal.animations.every(animation => animation.options.delay === 0));
    reveal.cleanup();
});
