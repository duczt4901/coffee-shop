import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync("src/components/ui/useEnhancedDisclosure.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function mount({ nativeOpen = false, reduced = false, failStyle = false } = {}) {
    const slots = [];
    const effects = [];
    const frames = new Map();
    const timers = new Map();
    const listeners = new Map();
    const details = Object.assign(new EventTarget(), { open: nativeOpen });
    const panel = { offsetHeight: 0, addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: (name) => listeners.delete(name) };
    let cursor = 0, dirty = true, first = true, sequence = 0, api;
    const react = {
        useRef(value) { const key = cursor++; return slots[key] ??= { current: value }; },
        useState(initial) {
            const key = cursor++;
            if (!(key in slots)) slots[key] = initial;
            return [slots[key], (next) => { if (slots[key] !== next) { slots[key] = next; dirty = true; } }];
        },
        useCallback(callback) { const key = cursor++; return slots[key] ??= callback; },
        useLayoutEffect(callback, deps) {
            const key = cursor++;
            const previous = slots[key];
            if (!previous || deps.some((dep, index) => dep !== previous.deps[index])) {
                effects.push(() => {
                    previous?.cleanup?.();
                    slots[key] = { deps, cleanup: callback() };
                });
            }
        },
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require: (name) => { assert.equal(name, "react"); return react; },
        requestAnimationFrame: (callback) => { frames.set(++sequence, callback); return sequence; },
        cancelAnimationFrame: (id) => frames.delete(id),
        setTimeout: (callback, delay) => { timers.set(++sequence, { callback, delay }); return sequence; },
        clearTimeout: (id) => timers.delete(id),
        queueMicrotask,
        getComputedStyle() {
            if (failStyle) throw new Error("style unavailable");
            return { transitionProperty: reduced ? "none" : "opacity, transform, visibility", transitionDuration: reduced ? "0s" : "350ms, .55s, .35s", transitionDelay: "0s" };
        },
    });
    const flush = () => {
        let rounds = 0;
        while (dirty) {
            assert(++rounds < 10, "disclosure effects must settle");
            dirty = false;
            cursor = 0;
            api = exports.useEnhancedDisclosure();
            api.detailsRef.current = details;
            api.panelRef.current = panel;
            if (!first) details.open = api.nativeOpen;
            first = false;
            effects.splice(0).forEach((effect) => effect());
        }
    };
    flush();
    return {
        get api() { return api; }, details, timers, listeners, flush,
        open() {
            api.setOpen(true);
            flush();
            for (let paint = 0; paint < 2; paint++) {
                const callbacks = [...frames.values()];
                frames.clear();
                callbacks.forEach((callback) => callback());
            }
            flush();
        },
        close() { api.setOpen(false); flush(); },
        transition(propertyName) { listeners.get("transitionend")?.({ target: panel, propertyName }); flush(); },
        nativeToggle(value) { details.open = value; details.dispatchEvent(new Event("toggle")); flush(); },
        unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
    };
}

test("enhanced native disclosure is closed in the accessibility tree until opened", () => {
    const mounted = mount();
    assert.equal(mounted.api.enhanced, true);
    assert.equal(mounted.details.open, false);
    mounted.open();
    assert.equal(mounted.api.open, true);
    assert.equal(mounted.details.open, true);
    const ref = mounted.api.detailsRef;
    mounted.close();
    assert.equal(mounted.api.open, false);
    assert.equal(mounted.details.open, true, "native wrapper stays open only while the closing transition runs");
    mounted.transition("opacity");
    assert.equal(mounted.details.open, true, "shorter transitions cannot cut off the transform");
    mounted.transition("transform");
    assert.equal(mounted.details.open, false);
    assert.equal(mounted.api.detailsRef, ref, "the native trigger and wrapper are never replaced");
    assert.equal(mounted.timers.size, 0);
});

test("closing fallback follows CSS duration, while reduced motion and missing CSS finish immediately", () => {
    const mounted = mount();
    mounted.open();
    mounted.close();
    const timer = [...mounted.timers.values()][0];
    assert.equal(timer.delay, 550);
    timer.callback();
    mounted.flush();
    assert.equal(mounted.details.open, false);
    for (const options of [{ reduced: true }, { failStyle: true }]) {
        const immediate = mount(options);
        immediate.open();
        immediate.close();
        assert.equal(immediate.details.open, false);
        assert.equal(immediate.timers.size, 0);
    }
});

test("a native disclosure opened before hydration stays open and reopening cancels stale closing work", () => {
    const mounted = mount({ nativeOpen: true });
    assert.equal(mounted.api.open, true);
    assert.equal(mounted.details.open, true);
    mounted.close();
    const stale = [...mounted.timers.values()][0].callback;
    mounted.open();
    stale();
    mounted.flush();
    assert.equal(mounted.api.open, true);
    assert.equal(mounted.details.open, true);
    assert.equal(mounted.timers.size, 0);
    assert.equal(mounted.listeners.size, 0);
});

test("unmount cancels pending closing timers and listeners", () => {
    const mounted = mount({ nativeOpen: true });
    mounted.close();
    mounted.unmount();
    assert.equal(mounted.timers.size, 0);
    assert.equal(mounted.listeners.size, 0);
});

test("browser-driven native toggles synchronize logical state without replaying entry", () => {
    const mounted = mount();
    mounted.nativeToggle(true);
    assert.equal(mounted.api.open, true);
    assert.equal(mounted.api.nativeOpen, true);
    mounted.nativeToggle(false);
    assert.equal(mounted.api.open, false);
    assert.equal(mounted.api.nativeOpen, false);
    mounted.open();
    mounted.close();
    mounted.nativeToggle(false);
    assert.equal(mounted.timers.size, 0, "native close cancels the pending animated close");
    mounted.unmount();
    mounted.nativeToggle(true);
    assert.equal(mounted.api.open, false, "unmounted controls no longer observe native changes");
});
