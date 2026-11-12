import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/native-motion.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
});
const { observeMotion, observeScroll } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);

function setGlobal(t, name, value) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => {
        if (previous) Object.defineProperty(globalThis, name, previous);
        else delete globalThis[name];
    });
}

test("motion preference changes clean up the old effect and allow re-enabling it", (t) => {
    const media = new EventTarget();
    media.matches = true;
    setGlobal(t, "window", { matchMedia: () => media });
    let active = 0;
    let starts = 0;
    const stop = observeMotion("test", () => {
        active++;
        starts++;
        return () => active--;
    });
    assert.equal(active, 1);
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    assert.equal(active, 0);
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    assert.equal(active, 1);
    assert.equal(starts, 2);
    stop();
    assert.equal(active, 0);
    media.dispatchEvent(new Event("change"));
    assert.equal(starts, 2, "unmount must remove the media listener");
});

test("scroll effects share a frame, observe layout changes, and release all work on unmount", (t) => {
    const windowEvents = new EventTarget();
    const fontEvents = new EventTarget();
    const pending = new Map();
    let nextId = 0;
    let resize;
    let observers = 0;
    setGlobal(t, "window", windowEvents);
    setGlobal(t, "document", { body: {}, fonts: fontEvents });
    setGlobal(t, "requestAnimationFrame", (callback) => { pending.set(++nextId, callback); return nextId; });
    setGlobal(t, "cancelAnimationFrame", (id) => pending.delete(id));
    setGlobal(t, "ResizeObserver", class {
        constructor(callback) { resize = callback; observers++; }
        observe() {}
        disconnect() { observers--; }
    });
    const flush = () => {
        const callbacks = [...pending.values()];
        pending.clear();
        callbacks.forEach((callback) => callback());
    };
    let first = 0;
    let second = 0;
    const stopFirst = observeScroll(() => first++);
    const stopSecond = observeScroll(() => second++);
    assert.deepEqual([first, second, observers], [1, 1, 1]);
    for (let index = 0; index < 20; index++) windowEvents.dispatchEvent(new Event("scroll"));
    windowEvents.dispatchEvent(new Event("resize"));
    resize();
    fontEvents.dispatchEvent(new Event("loadingdone"));
    assert.equal(pending.size, 1);
    flush();
    assert.deepEqual([first, second], [2, 2]);
    assert.equal(pending.size, 0, "idle pages must not start a continuous render loop");
    stopFirst();
    resize();
    flush();
    assert.deepEqual([first, second], [2, 3]);
    windowEvents.dispatchEvent(new Event("scroll"));
    stopSecond();
    assert.equal(observers, 0);
    assert.equal(pending.size, 0, "unmount must cancel a pending frame");
    windowEvents.dispatchEvent(new Event("scroll"));
    fontEvents.dispatchEvent(new Event("loadingdone"));
    assert.equal(pending.size, 0);
    const stopAgain = observeScroll(() => first++);
    assert.equal(observers, 1, "navigation back must reconnect the observer");
    stopAgain();
    assert.equal(observers, 0);
});

test("scroll updates still work without ResizeObserver or font events", (t) => {
    const events = new EventTarget();
    let pending;
    let calls = 0;
    setGlobal(t, "window", events);
    setGlobal(t, "document", { body: {} });
    setGlobal(t, "ResizeObserver", undefined);
    setGlobal(t, "requestAnimationFrame", (callback) => { pending = callback; return 1; });
    setGlobal(t, "cancelAnimationFrame", () => { pending = undefined; });
    const stop = observeScroll(() => calls++);
    assert.equal(calls, 1);
    events.dispatchEvent(new Event("scroll"));
    pending();
    assert.equal(calls, 2);
    stop();
    events.dispatchEvent(new Event("scroll"));
    assert.equal(pending, undefined);
});

test("a missing or unsupported stable viewport cannot return a zero scroll height", async (t) => {
    const source = ts.transpileModule(readFileSync(new URL("../src/lib/scroll-viewport.ts", import.meta.url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    });
    const { getScrollViewportHeight } = await import(`data:text/javascript;base64,${Buffer.from(source.outputText).toString("base64")}`);
    let probe = { clientHeight: 800 };
    setGlobal(t, "document", { querySelector: () => probe, documentElement: { clientHeight: 700 } });
    setGlobal(t, "window", { innerHeight: 900 });
    assert.equal(getScrollViewportHeight(), 800);
    probe = { clientHeight: 0 };
    assert.equal(getScrollViewportHeight(), 900);
    probe = null;
    assert.equal(getScrollViewportHeight(), 900);
    window.innerHeight = 0;
    assert.equal(getScrollViewportHeight(), 700);
});

test("a broken scroll subscriber rolls back without blocking the next subscriber", (t) => {
    const events = new EventTarget();
    let frame;
    let broken = false;
    let healthyCalls = 0;
    let failures = 0;
    setGlobal(t, "window", events);
    setGlobal(t, "document", { body: {} });
    setGlobal(t, "ResizeObserver", undefined);
    setGlobal(t, "requestAnimationFrame", callback => { frame = callback; return 1; });
    setGlobal(t, "cancelAnimationFrame", () => { frame = undefined; });
    const stopBroken = observeScroll(() => { if (broken) throw Error("animation failed"); }, () => failures++);
    const stopHealthy = observeScroll(() => healthyCalls++);
    broken = true;
    events.dispatchEvent(new Event("scroll"));
    frame();
    assert.equal(failures, 1);
    assert.equal(healthyCalls, 2);
    events.dispatchEvent(new Event("scroll"));
    frame();
    assert.equal(failures, 1, "the failed subscriber must be removed");
    assert.equal(healthyCalls, 3);
    stopBroken();
    stopHealthy();
});

test("failed initial scroll setup releases its subscription and listeners", (t) => {
    const events = new EventTarget();
    let queued = 0;
    setGlobal(t, "window", events);
    setGlobal(t, "document", { body: {} });
    setGlobal(t, "ResizeObserver", undefined);
    setGlobal(t, "requestAnimationFrame", () => ++queued);
    setGlobal(t, "cancelAnimationFrame", () => {});
    assert.throws(() => observeScroll(() => { throw Error("setup failed"); }), /setup failed/);
    events.dispatchEvent(new Event("scroll"));
    assert.equal(queued, 0);
});

test("failed motion setup removes its preference listener", (t) => {
    let listener;
    const media = {
        matches: true,
        addEventListener: (_name, callback) => { listener = callback; },
        removeEventListener: (_name, callback) => { if (listener === callback) listener = undefined; },
    };
    setGlobal(t, "window", { matchMedia: () => media });
    assert.throws(() => observeMotion("test", () => { throw Error("setup failed"); }), /setup failed/);
    assert.equal(listener, undefined);
});
