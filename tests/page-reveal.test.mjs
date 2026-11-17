import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const compile = file => ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const source = compile("src/lib/page-reveal-runtime.ts");
const component = compile("src/components/layout/PageReveal.tsx");
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

function mount({ initial = true, home = initial, reduced = false, scrollY = 0, hash = "", age = 0, escaped = false, stopped = false, throwAt = -1, heroTop = 200, entryBounds = [{ top: 100, bottom: 180, width: 500, height: 80 }] } = {}) {
    const animations = [], timers = new Map(), frames = new Map();
    const fonts = deferred(), image = deferred();
    let id = 0, calls = 0, stops = 0, starts = 0, entryQueries = 0;
    const animate = (_frames, timing) => {
        if (calls++ === throwAt) throw Error("Animation API failed");
        const result = deferred();
        const animation = { frames: _frames, finished: result.promise, resolve: result.resolve, timing, cancelled: false, hiddenAtCancel: false, cancel() { this.hiddenAtCancel = overlay.hidden; this.cancelled = true; result.reject(Error("cancelled")); } };
        animations.push(animation); return animation;
    };
    const node = (target, bounds) => ({ parentElement: null, closest() { return this; }, getBoundingClientRect: () => bounds, animate(frames, timing) { const animation = animate(frames, timing); animation.target = target; return animation; } });
    const entryTargets = entryBounds.map((bounds, index) => ({ ...node(`entry-${index}`, bounds), dataset: bounds.unmarked ? {} : { reveal: bounds.mode ?? "lines" }, tagName: bounds.tagName ?? "P", textContent: "Static copy", querySelector: () => bounds.container ? {} : null,
        closest: () => null, parentElement: null }));
    entryTargets.forEach((target, index) => {
        if (entryBounds[index].nested) target.parentElement = entryTargets[0];
        target.closest = selector => selector.includes("data-reveal-skip") ? (entryBounds[index].blocked ? {} : null)
            : selector === "[data-reveal-step]" && entryBounds[index].step !== undefined ? { dataset: { revealStep: String(entryBounds[index].step) } } : null;
    });
    const brand = node("brand", { left: 420, top: 300, width: 160, height: 160 });
    const logo = node("heroMark", { left: 480, top: heroTop, width: 40, height: 40 });
    const curtain = node("curtain");
    const heroBrand = { querySelector: () => logo, querySelectorAll: () => [node("heroName"), node("heroSlogan")] };
    const overlay = { hidden: false, isConnected: true, dataset: { revealState: "waiting", revealHome: String(home) }, animate(frames, timing) { const animation = animate(frames, timing); animation.target = "overlay"; return animation; }, querySelector: selector => selector === "[data-reveal-curtain]" ? curtain : brand };
    const root = { style: { overflow: "scroll" }, dataset: {} }, content = [{ inert: false }, { inert: true }];
    const lenis = { isStopped: stopped, stop() { stops++; this.isStopped = true; }, start() { starts++; this.isStopped = false; } };
    const events = Object.assign(new EventTarget(), { scrollY, innerHeight: 800, location: { hash }, __lavuonLenis: lenis, matchMedia: query => ({ matches: query.includes("prefers-reduced-motion") && reduced }) });
    const exports = {};
    const context = {
        exports, window: undefined, Event, performance: { now: () => age }, getComputedStyle: () => ({ visibility: escaped ? "hidden" : "visible" }),
        document: { documentElement: root, fonts: { ready: fonts.promise }, querySelectorAll(selector) { if (selector.includes("data-page-entry")) { entryQueries++; return entryTargets; } return content; },
            querySelector: selector => selector.startsWith("[data-page-reveal]") ? (initial ? overlay : null)
                : selector === "main" ? { querySelector: () => ({ poster: "/poster.webp" }), querySelectorAll() { entryQueries++; return entryTargets; } }
                : selector === "[data-hero-brand]" ? (home ? heroBrand : null) : node(selector),
        },
        Image: class { decode() { return image.promise; } },
        setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; }, clearTimeout(key) { timers.delete(key); },
        requestAnimationFrame(fn) { frames.set(++id, fn); return id; }, cancelAnimationFrame(key) { frames.delete(key); },
    };
    vm.runInNewContext(source, context);
    const client = {};
    vm.runInNewContext(component, { exports: client, require(name) {
        if (name === "react/jsx-runtime") return jsxRuntime;
        if (name === "react") return { useRef: () => ({ current: null }), useState: value => [value, () => {}], useEffect() {} };
        if (name.endsWith("site-config")) return { siteConfig: { site: { name: "Là Vườn Coffee" } } };
        if (name.endsWith("BrandIntro")) return { BrandMark: () => jsxRuntime.jsx("svg", { "data-brand-mark": true }) };
        if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
        throw Error(name);
    } });
    const markup = client.PageReveal({ initial, home, onReady() {} });
    return {
        markup, root, content, lenis, animations, overlay, timers, frames, events, entryTargets, entryQueries: () => entryQueries,
        install() { context.window = events; exports.installPageRevealRuntime(); },
        start() { context.window = events; exports.installPageRevealRuntime(); const cleanup = events.__lavuonReveal.attach(overlay, initial, home, () => {}); return () => { overlay.isConnected = false; cleanup(); }; },
        phase: () => overlay.dataset.revealState, starts: () => starts, stops: () => stops,
        async ready(failedImage = false) { fonts.resolve(); if (failedImage) image.reject(Error("missing image")); else image.resolve(); await flush(); },
        tick(delay) { for (const [key, timer] of [...timers]) if (timer.delay === delay) { timers.delete(key); timer.fn(); } },
        paint() { while (frames.size) { const [key, fn] = frames.entries().next().value; frames.delete(key); fn(); } },
        time(value) { age = value; },
    };
}

test("ordinary cold loads have no artificial minimum while home keeps its loading choreography", () => {
    const ordinary = mount({ home: false });
    const cancelOrdinary = ordinary.start();
    assert(![...ordinary.timers.values()].some(timer => timer.delay === 450));
    const home = mount();
    const cancelHome = home.start();
    assert([...home.timers.values()].some(timer => timer.delay === 450));
    cancelOrdinary();
    cancelHome();
});

test("server intro has a no-JavaScript escape and does not make the page inert in HTML", () => {
    const html = renderToStaticMarkup(mount().markup);
    assert(html.includes('data-reveal-state="waiting"'));
    assert(html.includes("Đang mở Là Vườn Coffee"));
    assert(html.includes("<noscript>"));
    assert(html.includes("display:none!important"));
    assert(!html.includes('inert=""'));
    assert(html.includes('class="spinner"'));
    assert(html.includes('data-brand-mark="true"'));
    assert(!html.includes("Chậm một chút"), "loading contains no hero slogan");
    assert(!html.includes("data-brand-text"), "loading contains no visible brand text");
    assert.match(html, /<span aria-hidden="true" class="spinner"/);
});

test("initial reveal completes before React attaches and late hydration does not replay it", async () => {
    const intro = mount();
    const cleanup = intro.start();
    await intro.ready();
    intro.tick(450);
    await flush();
    intro.paint();
    intro.animations.forEach(animation => animation.resolve());
    await flush();
    const count = intro.animations.length;
    let ready = 0;
    const detach = intro.events.__lavuonReveal.attach(intro.overlay, true, true, () => ready++);
    assert.equal(ready, 1);
    assert.equal(intro.root.dataset.initialReveal, "done");
    assert.equal(intro.root.dataset.revealActive, "false");
    assert.equal(intro.animations.length, count);
    assert.equal(intro.overlay.hidden, true);
    detach();
    cleanup();
});

test("a bootstrap arriving after the CSS escape never covers the visible page again", () => {
    const intro = mount({ age: 8000, escaped: true });
    const cleanup = intro.start();
    assert.equal(intro.overlay.hidden, true);
    assert.equal(intro.root.dataset.initialReveal, "done");
    assert.equal(intro.root.style.overflow, "scroll");
    assert.equal(intro.animations.length, 0);
    assert(intro.events.__lavuonReveal.ownsEntry(intro.entryTargets[0]), "late editorial hydration must leave already exposed copy visible");
    cleanup();
});

test("a closing menu cannot release a route reveal lock or leave scrolling locked afterward", async () => {
    const intro = mount({ initial: false });
    intro.install();
    const releaseMenu = intro.events.__lavuonReveal.lockScroll();
    const cleanup = intro.start();
    releaseMenu(); releaseMenu();
    assert.equal(intro.root.style.overflow, "hidden");
    assert.equal(intro.stops(), 1);
    assert.equal(intro.starts(), 0);
    await flush(); intro.paint();
    intro.animations.forEach(animation => animation.resolve());
    await flush();
    assert.equal(intro.root.style.overflow, "scroll");
    assert.equal(intro.starts(), 1);
    cleanup();
    assert.equal(intro.starts(), 1);
});

test("unlock does not restart a Lenis instance destroyed by a motion preference change", () => {
    const intro = mount({ initial: false });
    const cleanup = intro.start();
    delete intro.events.__lavuonLenis;
    cleanup();
    assert.equal(intro.root.style.overflow, "scroll");
    assert.equal(intro.starts(), 0);
});

test("a late bootstrap adopts a scroll lock acquired by the menu fallback", async () => {
    const intro = mount({ initial: false });
    const fallback = {};
    vm.runInNewContext(compile("src/lib/scroll-lock.ts"), {
        exports: fallback, window: intro.events, document: { documentElement: intro.root },
        require: () => ({ getSmoothScroll: () => intro.lenis }),
    });
    const releaseMenu = fallback.lockScroll();
    const cleanup = intro.start();
    releaseMenu();
    assert.equal(intro.root.style.overflow, "hidden");
    assert.equal(intro.stops(), 1);
    await flush(); intro.paint();
    intro.animations.forEach(animation => animation.resolve());
    await flush();
    assert.equal(intro.root.style.overflow, "scroll");
    assert.equal(intro.starts(), 1);
    cleanup();
});

test("slow initial loading latches placeholder mode, including late hydration", () => {
    const slow = mount();
    const cleanup = slow.start();
    slow.tick(5000);
    assert.equal(slow.root.dataset.coffeeFallback, "true");
    cleanup();
    assert.equal(slow.root.dataset.coffeeFallback, "true", "route changes must not re-enable 3D during this document visit");
    const late = mount({ age: 8000 });
    late.start()();
    assert.equal(late.root.dataset.coffeeFallback, "true", "the deadline counts pre-hydration time");
});

test("fast loading cancels the model deadline and delayed finish still detects a slow load", async () => {
    for (const age of [2000, 6000]) {
        const intro = mount();
        const cleanup = intro.start();
        await intro.ready();
        intro.tick(450);
        await flush();
        intro.paint();
        intro.time(age);
        intro.animations.forEach(animation => animation.resolve());
        await flush();
        intro.tick(5000);
        assert.equal(intro.root.dataset.coffeeFallback, age >= 5000 ? "true" : undefined);
        cleanup();
    }
});

test("loading shrinks only the sun into the hero and starts text reveal after opening", async () => {
    const intro = mount();
    const cleanup = intro.start();
    assert.equal(intro.root.style.overflow, "hidden");
    assert.equal(intro.overlay.dataset.revealManaged, "true", "the independent bootstrap owns the CSS-only timeout");
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
    assert.equal(brand.frames[1].transform, "translate(calc(-50% + 0px), calc(-50% + -160px)) scale(0.25)");
    assert(!brand.frames.some(frame => frame.opacity === 0), "logo stays visible throughout the handoff");
    const logo = intro.animations.find(animation => animation.target === "heroMark");
    assert(logo.frames.every(frame => frame.opacity === 0), "the real logo is hidden only while its matching copy flies");
    assert.equal(logo.frames[0].transform, undefined, "logo scroll positioning stays on its parent");
    const texts = intro.animations.filter(animation => ["heroName", "heroSlogan"].includes(animation.target));
    assert.equal(texts.length, 2, "the first visit also reveals hero text independently of the logo handoff");
    assert.deepEqual(texts.map(animation => animation.timing.delay), [550, 630]);
    assert(texts.every(animation => animation.frames[0].opacity === 0 && animation.timing.fill === "both"), "text stays hidden during the delay behind the curtain");
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

test("restored positions, anchors and slow HTML responses reveal without moving the page", async () => {
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
    assert.equal(intro.animations.find(animation => animation.target === "overlay").timing.duration, 800);
    assert.equal(intro.root.style.overflow, "hidden");
    cleanup();
});

test("ordinary arrivals fade a stationary loading cover and reveal content groups separately", async () => {
    for (const initial of [true, false]) {
        const intro = mount({ initial, home: false, scrollY: 1500 });
        const cleanup = intro.start();
        await intro.ready();
        intro.paint();
        const cover = intro.animations.find(animation => animation.target === "overlay");
        assert(cover);
        assert.equal(cover.timing.duration, 800);
        assert.deepEqual(Array.from(cover.frames, frame => frame.opacity), [1, 0]);
        assert(cover.frames.every(frame => !("transform" in frame) && !("clipPath" in frame)));
        assert(intro.animations.every(animation => animation.frames.every(frame => !("filter" in frame))));
        assert.equal(intro.animations.filter(animation => animation.target.startsWith("entry-")).length, 1);
        assert.equal(intro.events.scrollY, 1500);
        intro.animations.forEach(animation => animation.resolve());
        await flush();
        assert.equal(intro.root.style.overflow, "scroll");
        assert.equal(intro.overlay.hidden, true);
        cleanup();
    }
});

test("arrival owns only visible top-level groups, staggers them and unlocks before their animation ends", async () => {
    const intro = mount({ initial: false, entryBounds: [
        { top: 100, bottom: 180, width: 500, height: 80 },
        { top: 220, bottom: 320, width: 500, height: 100 },
        { top: 900, bottom: 980, width: 500, height: 80 },
        { top: 120, bottom: 160, width: 200, height: 40, nested: true },
    ] });
    const cleanup = intro.start(); await flush(); intro.paint();
    const entries = intro.animations.filter(animation => animation.target.startsWith("entry-"));
    assert.equal(entries.length, 2);
    assert.deepEqual(entries.map(animation => animation.timing.delay), [200, 300]);
    assert(entries.every(animation => animation.timing.duration === 1600));
    assert(intro.events.__lavuonReveal.ownsEntry(intro.entryTargets[0]));
    assert(!intro.events.__lavuonReveal.ownsEntry(intro.entryTargets[2]));
    intro.animations.find(animation => animation.target === "overlay").resolve(); await flush();
    assert.equal(intro.root.style.overflow, "scroll");
    assert.equal(intro.root.dataset.revealActive, "false");
    assert(entries.every(animation => !animation.cancelled), "text continues after input unlocks");
    cleanup();
    assert(entries.every(animation => animation.cancelled), "navigation cancels unfinished content motion");
});

test("arrival respects explicit row steps and restarts independent groups", async () => {
    const bounds = { top: 100, bottom: 180, width: 500, height: 80 };
    const intro = mount({ initial: false, entryBounds: [
        ...[0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 0].map(step => ({ ...bounds, step })),
    ] });
    const cleanup = intro.start(); await flush(); intro.paint();
    const entries = intro.animations.filter(animation => animation.target.startsWith("entry-"));
    assert.deepEqual(entries.map(animation => animation.timing.delay), [200, 200, 380, 380, 560, 560, 740, 740, 920, 920, 200]);
    assert(intro.entryTargets.every(target => !target.dataset.revealStep), "sequence metadata stays on its SSR owner");
    cleanup();
});

test("static text and rules share entry motion without changing SSR attributes or delaying long lists", async () => {
    const bounds = { top: 100, bottom: 180, width: 500, height: 80 };
    const intro = mount({ initial: false, entryBounds: [
        ...Array.from({ length: 9 }, () => ({ ...bounds, unmarked: true })),
        { ...bounds, mode: "border" },
        { ...bounds, unmarked: true, blocked: true },
        { ...bounds, unmarked: true, container: true },
    ] });
    const cleanup = intro.start(); await flush(); intro.paint();
    const entries = intro.animations.filter(animation => animation.target.startsWith("entry-"));
    assert.equal(entries.length, 10, "live/managed copy and containers are excluded");
    assert(entries.every(animation => animation.timing.delay <= 700));
    assert.deepEqual(Array.from(entries[9].frames, frame => frame.transform), ["scaleX(0)", "scaleX(1)"]);
    assert(intro.entryTargets.slice(0, 9).every(target => Object.keys(target.dataset).length === 0), "pre-hydration discovery must not mutate markup");
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

test("cached navigation home reveals with a continuous logo handoff instead of an empty brown screen", async () => {
    const intro = mount({ initial: false, home: true });
    const cleanup = intro.start();
    await flush();
    intro.paint();
    assert.equal(intro.animations[0].target, "curtain");
    assert.equal(intro.animations[0].timing.duration, 900);
    assert(intro.animations.some(animation => animation.target === "brand"));
    assert(intro.animations.some(animation => animation.target === "heroName"));
    assert(intro.animations.some(animation => animation.target === "heroSlogan"));
    assert.equal(intro.entryQueries(), 0, "homepage never enters the ordinary content controller");
    cleanup();
});

test("a deep home reload fades the loading brand without flying to an offscreen hero", async () => {
    const intro = mount({ scrollY: 4000, heroTop: -3500 });
    const cleanup = intro.start();
    await intro.ready();
    intro.tick(450);
    await flush();
    intro.paint();
    assert.equal(intro.phase(), "opening");
    assert(!intro.animations.some(animation => animation.target === "heroMark"));
    assert(intro.animations.find(animation => animation.target === "brand").frames.some(frame => frame.opacity === 0));
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
