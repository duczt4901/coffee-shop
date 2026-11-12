import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const source = ts.transpileModule(readFileSync("src/components/layout/PageReveal.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function mount({ initial = true, home = initial, reduced = false, scrollY = 0, hash = "", age = 0, stopped = false, throwAt = -1 } = {}) {
    const refs = [], animations = [], timers = new Map(), frames = new Map();
    const fonts = deferred(), image = deferred();
    const effects = [];
    let phase = "waiting", id = 0, calls = 0, stops = 0, starts = 0;
    const animate = (_frames, timing) => {
        if (calls++ === throwAt) throw Error("Animation API failed");
        const result = deferred();
        const animation = { frames: _frames, finished: result.promise, resolve: result.resolve, timing, cancelled: false, hiddenAtCancel: false, cancel() { this.hiddenAtCancel = overlay.hidden; this.cancelled = true; result.reject(Error("cancelled")); } };
        animations.push(animation);
        return animation;
    };
    const node = (target, bounds) => ({ getBoundingClientRect: () => bounds, animate(frames, timing) { const animation = animate(frames, timing); animation.target = target; return animation; } });
    const brand = node("brand", { left: 400, top: 300, width: 200, height: 140 });
    const logo = node("logo", { left: 300, top: 200, width: 400, height: 280 });
    const overlay = { hidden: false, dataset: { revealState: phase }, animate, querySelector: () => brand };
    const root = { style: { overflow: "scroll" } };
    const content = [{ inert: false }, { inert: true }];
    const events = Object.assign(new EventTarget(), {
        scrollY, location: { hash }, matchMedia: query => ({ matches: query.includes("prefers-reduced-motion") && reduced }),
    });
    const lenis = { isStopped: stopped, stop() { stops++; this.isStopped = true; }, start() { starts++; this.isStopped = false; } };
    const exports = {};
    vm.runInNewContext(source, {
        exports, window: events, performance: { now: () => age },
        document: {
            documentElement: root, fonts: { ready: fonts.promise }, querySelectorAll: () => content,
            querySelector: selector => selector === "main" ? { querySelector: () => ({ poster: "/poster.webp" }) }
                : selector === "[data-hero]" ? (home ? {} : null)
                : selector === "[data-page-reveal-logo]" ? (home ? logo : null) : node(selector),
        },
        Image: class { decode() { return image.promise; } },
        setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; },
        clearTimeout(key) { timers.delete(key); },
        requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
        cancelAnimationFrame(key) { frames.delete(key); },
        require(name) {
            if (name === "react/jsx-runtime") return jsxRuntime;
            if (name === "react") return {
                useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
                useState(value) { return typeof value === "boolean" ? [value, () => {}] : [phase, next => { phase = next; overlay.dataset.revealState = next; overlay.hidden = next === "done"; }]; },
                useEffect(setup) { effects.push(setup); },
            };
            if (name === "lenis/react") return { useLenis: () => lenis };
            if (name.endsWith("database")) return { database: { site: { name: "Coffee Shop" } } };
            if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
            throw Error(name);
        },
    });
    const markup = exports.PageReveal({ initial, onReady() {} });
    refs[0].current = overlay;
    refs[1].current = node("curtain");
    return {
        markup, root, content, lenis, animations, overlay, timers, frames, events,
        start: () => { const cleanups = effects.map(effect => effect()); return () => cleanups.forEach(cleanup => cleanup?.()); }, phase: () => phase, starts: () => starts, stops: () => stops,
        async ready(failedImage = false) { fonts.resolve(); if (failedImage) image.reject(Error("missing image")); else image.resolve(); await flush(); },
        tick(delay) { for (const [key, timer] of [...timers]) if (timer.delay === delay) { timers.delete(key); timer.fn(); } },
        paint() { while (frames.size) { const [key, fn] = frames.entries().next().value; frames.delete(key); fn(); } },
    };
}

test("server intro has a no-JavaScript escape and does not make the page inert in HTML", () => {
    const html = renderToStaticMarkup(mount().markup);
    assert(html.includes('data-reveal-state="waiting"'));
    assert(html.includes("Đang mở Coffee Shop"));
    assert(html.includes("<noscript>"));
    assert(html.includes("display:none!important"));
    assert(!html.includes('inert=""'));
    assert(html.includes('class="spinner"'));
});

test("shell readiness starts reveal but keeps scroll locked until the logo handoff finishes", async () => {
    const intro = mount();
    const cleanup = intro.start();
    assert.equal(intro.root.style.overflow, "hidden");
    assert(intro.content.every(element => element.inert));
    assert.equal(intro.phase(), "waiting");
    await intro.ready();
    assert.equal(intro.animations.length, 0, "layout gets two frames before the reveal");
    intro.tick(450);
    await flush();
    intro.paint();
    assert.equal(intro.phase(), "opening");
    assert.equal(intro.root.style.overflow, "hidden");
    assert(intro.content.every(element => element.inert));
    assert.equal(intro.starts(), 0);
    const cover = intro.animations.find(animation => animation.target === "curtain");
    assert.equal(cover.frames[1].clipPath, "inset(0 0 100% 0)");
    assert.equal(cover.timing.duration, 900);
    const brand = intro.animations.find(animation => animation.target === "brand");
    assert.equal(brand.frames[1].transform, "translate(calc(-50% + 0px), calc(-50% + -30px)) scale(2)");
    assert(!brand.frames.some(frame => frame.opacity === 0), "logo stays visible throughout the handoff");
    const logo = intro.animations.find(animation => animation.target === "logo");
    assert(logo.frames.every(frame => frame.opacity === 0), "the real logo is hidden only while its matching copy flies");
    assert.equal(logo.frames[0].transform, undefined, "logo scroll positioning stays on its parent");
    intro.animations.forEach(animation => animation.resolve());
    await flush();
    assert.equal(intro.phase(), "done");
    assert.equal(intro.root.style.overflow, "scroll");
    assert.deepEqual(intro.content.map(element => element.inert), [false, true]);
    assert.equal(intro.starts(), 1);
    assert.equal(intro.overlay.hidden, true);
    assert(intro.animations.every(animation => animation.hiddenAtCancel), "panels must be hidden before cancelling their transparent end state");
    cleanup();
});

test("unavailable media cannot delay the reveal indefinitely", async () => {
    const intro = mount();
    const cleanup = intro.start();
    intro.tick(1200);
    intro.tick(450);
    await flush();
    intro.paint();
    assert.equal(intro.phase(), "opening");
    intro.tick(6000);
    assert.equal(intro.phase(), "done");
    assert.equal(intro.root.style.overflow, "scroll");
    assert(intro.animations.every(animation => animation.cancelled));
    cleanup();
});

test("restored positions, anchors and late hydration still reveal without moving the page", async () => {
    for (const options of [{ scrollY: 500 }, { hash: "#products" }, { age: 6500 }]) {
        const intro = mount(options);
        const cleanup = intro.start();
        await intro.ready();
        intro.tick(450);
        await flush();
        intro.paint();
        assert.equal(intro.phase(), "opening");
        assert(intro.animations.length > 0);
        assert.equal(intro.events.scrollY, options.scrollY ?? 0);
        assert.equal(intro.root.style.overflow, "hidden");
        cleanup();
    }
});

test("even an instant route commit reveals without waiting for media or fonts", async () => {
    const intro = mount({ initial: false });
    const cleanup = intro.start();
    await flush();
    intro.paint();
    assert.equal(intro.phase(), "opening");
    assert.equal(intro.animations[0].timing.duration, 600);
    assert.equal(intro.root.style.overflow, "hidden");
    cleanup();
});

test("reduced motion uses a short opacity reveal on every route", async () => {
    const intro = mount({ initial: false, reduced: true });
    const cleanup = intro.start();
    await flush();
    intro.paint();
    assert.equal(intro.phase(), "opening");
    assert.equal(intro.animations.length, 1);
    assert.equal(intro.animations[0].timing.duration, 100);
    intro.animations[0].resolve();
    await flush();
    assert.equal(intro.phase(), "done");
    cleanup();
});

test("cached navigation home still reveals the whole hero with its poster, without a new loading logo", async () => {
    const intro = mount({ initial: false, home: true });
    const cleanup = intro.start();
    await flush();
    intro.paint();
    assert.equal(intro.animations[0].target, "curtain");
    assert.equal(intro.animations[0].timing.duration, 900);
    assert(!intro.animations.some(animation => animation.target === "brand"));
    cleanup();
});

test("reduced motion on the first home visit fades without logo flights", async () => {
    const intro = mount({ reduced: true });
    const cleanup = intro.start();
    await intro.ready();
    intro.tick(450);
    await flush();
    intro.paint();
    assert.equal(intro.animations.length, 1);
    assert.equal(intro.animations[0].timing.duration, 100);
    cleanup();
});

test("Escape can skip the intro and a pre-existing scroll lock is preserved", async () => {
    const intro = mount({ stopped: true });
    const cleanup = intro.start();
    intro.events.dispatchEvent(Object.assign(new Event("keydown"), { key: "Escape" }));
    await intro.ready();
    intro.paint();
    assert.equal(intro.phase(), "done");
    assert.equal(intro.animations.length, 0);
    assert.equal(intro.starts(), 0);
    assert.equal(intro.lenis.isStopped, true);
    cleanup();
});

test("wheel, touch and scroll keys cannot move the page or dismiss its reveal", async () => {
    const intro = mount({ initial: false, home: true });
    const cleanup = intro.start();
    await flush();
    intro.paint();
    for (const event of [new Event("wheel", { cancelable: true }), new Event("touchmove", { cancelable: true }), Object.assign(new Event("keydown", { cancelable: true }), { key: "ArrowDown" })]) {
        intro.events.dispatchEvent(event);
        assert(event.defaultPrevented);
        assert.equal(intro.phase(), "opening");
    }
    intro.animations.forEach(animation => animation.resolve());
    await flush();
    const after = new Event("wheel", { cancelable: true });
    intro.events.dispatchEvent(after);
    assert.equal(intro.phase(), "done");
    assert.equal(after.defaultPrevented, false, "scroll input must work again after reveal");
    cleanup();
});

test("partial reveal failure and missing image release content and cancel animations", async () => {
    const intro = mount({ throwAt: 1 });
    const cleanup = intro.start();
    await intro.ready(true);
    intro.tick(450);
    await flush();
    intro.paint();
    assert.equal(intro.phase(), "done");
    assert.equal(intro.root.style.overflow, "scroll");
    assert(intro.animations.every(animation => animation.cancelled));
    cleanup();
});

test("cached initial content still shows loading before revealing", async () => {
    const intro = mount();
    const cleanup = intro.start();
    await intro.ready();
    intro.paint();
    assert.equal(intro.phase(), "waiting");
    assert.equal(intro.animations.length, 0);
    intro.tick(450);
    await flush();
    intro.paint();
    assert.equal(intro.phase(), "opening");
    cleanup();
});

test("unmount restores controls and late readiness cannot start an animation", async () => {
    const intro = mount();
    const cleanup = intro.start();
    cleanup();
    await intro.ready();
    intro.paint();
    assert.equal(intro.animations.length, 0);
    assert.equal(intro.frames.size, 0);
    assert.equal(intro.timers.size, 0);
    assert.equal(intro.root.style.overflow, "scroll");
    assert.deepEqual(intro.content.map(element => element.inert), [false, true]);
});
