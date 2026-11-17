(function(exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installPageRevealRuntime = installPageRevealRuntime;
const MODEL_FALLBACK_AFTER_MS = 5000;
function lockScroll() {
    const root = document.documentElement;
    const state = window.__lavuonScrollLocks ?? (window.__lavuonScrollLocks = { count: 0 });
    if (state.count === 0) {
        const overflow = root.style.overflow;
        const lenis = window.__lavuonLenis;
        const stoppedHere = lenis && !lenis.isStopped;
        const restore = () => {
            root.style.overflow = overflow;
            if (stoppedHere && window.__lavuonLenis === lenis)
                lenis.start();
        };
        try {
            root.style.overflow = "hidden";
            if (stoppedHere)
                lenis.stop();
            state.restore = restore;
        }
        catch (error) {
            restore();
            throw error;
        }
    }
    state.count++;
    let released = false;
    return () => {
        if (released)
            return;
        released = true;
        if (--state.count === 0) {
            state.restore?.();
            state.restore = undefined;
        }
    };
}
function startReveal(overlay, firstLoad, home) {
    const curtain = overlay.querySelector("[data-reveal-curtain]");
    let opened = false;
    const callbacks = new Set();
    const notify = () => { opened = true; callbacks.forEach(callback => callback()); };
    let disposed = false;
    let finished = false;
    let frame = 0;
    let deadline;
    let mediaDeadline;
    let loadingDeadline;
    let modelDeadline;
    const animations = [];
    const root = document.documentElement;
    const content = Array.from(document.querySelectorAll("[data-site-content]"));
    const previousInert = content.map(element => element.inert);
    let locked = false;
    let releaseScroll;
    const cancelAnimations = () => animations.forEach(animation => {
        void animation.finished.catch(() => { });
        animation.cancel();
    });
    const unlock = () => {
        if (locked) {
            locked = false;
            releaseScroll?.();
            content.forEach((element, index) => { element.inert = previousInert[index]; });
        }
    };
    const finish = () => {
        if (disposed || finished)
            return;
        finished = true;
        clearTimeout(deadline);
        clearTimeout(mediaDeadline);
        clearTimeout(loadingDeadline);
        clearTimeout(modelDeadline);
        if (firstLoad && performance.now() >= MODEL_FALLBACK_AFTER_MS)
            root.dataset.coffeeFallback = "true";
        cancelAnimationFrame(frame);
        overlay.hidden = true;
        root.dataset.revealActive = "false";
        if (firstLoad)
            root.dataset.initialReveal = "done";
        cancelAnimations();
        releaseInput();
        unlock();
        notify();
        overlay.dataset.revealState = "done";
        window.dispatchEvent(new Event("lavuon:reveal-done"));
    };
    const open = () => {
        if (disposed || finished)
            return;
        overlay.dataset.revealState = "opening";
        notify();
        try {
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (home && !reduced && curtain)
                animations.push(curtain.animate([
                    { clipPath: "inset(0 0 0% 0)" },
                    { clipPath: "inset(0 0 100% 0)" },
                ], { duration: 900, easing: "cubic-bezier(0.76, 0, 0.24, 1)", fill: "both" }));
            else
                animations.push(overlay.animate(reduced ? [{ opacity: 1 }, { opacity: 0 }] : [
                    { transform: "translateY(0%)" },
                    { transform: "translateY(-100%)" },
                ], {
                    duration: reduced ? 100 : 600, easing: "cubic-bezier(0.3, 0, 0.3, 1)", fill: "both",
                }));
            const brand = overlay.querySelector("[data-reveal-brand]");
            const heroBrand = document.querySelector("[data-hero-brand]");
            const logo = heroBrand?.querySelector("[data-brand-mark]");
            const from = brand?.getBoundingClientRect();
            const to = logo?.getBoundingClientRect();
            const handoff = firstLoad && home && !reduced && brand && logo && from?.width && to?.width && to.top + to.height > 0 && to.top < window.innerHeight;
            if (handoff) {
                const x = to.left + to.width / 2 - from.left - from.width / 2;
                const y = to.top + to.height / 2 - from.top - from.height / 2;
                animations.push(brand.animate([
                    { transform: "translate(-50%, -50%) scale(1)" },
                    { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${to.width / from.width})` },
                ], { duration: 900, easing: "cubic-bezier(0.76, 0, 0.24, 1)", fill: "both" }));
                animations.push(logo.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 900, fill: "both" }));
            }
            else if (brand && firstLoad && !reduced)
                animations.push(brand.animate([
                    { opacity: 1 }, { opacity: 0 },
                ], { duration: 450, easing: "ease-in", fill: "both" }));
            const header = document.querySelector("[data-site-header]");
            if (header && !reduced)
                animations.push(header.animate(home ? [
                    { opacity: 0, filter: "blur(4px)" },
                    { opacity: 1, filter: "blur(0px)" },
                ] : [
                    { opacity: 0 },
                    { opacity: 1 },
                ], { duration: 500, delay: home ? 300 : 100, easing: "ease-out", fill: "both" }));
            if (heroBrand && !reduced && to && to.top + to.height > 0 && to.top < window.innerHeight) {
                if (logo && !handoff)
                    animations.push(logo.animate([
                        { opacity: 0, transform: "translateY(1rem)" },
                        { opacity: 1, transform: "translateY(0)" },
                    ], { duration: 700, delay: 450, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }));
                Array.from(heroBrand.querySelectorAll("[data-brand-text]")).forEach((line, index) => animations.push(line.animate([
                    { opacity: 0, transform: "translateY(1rem)" },
                    { opacity: 1, transform: "translateY(0)" },
                ], { duration: 700, delay: 550 + index * 80, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" })));
            }
            const heading = document.querySelector("main h1");
            if (!home && heading && !reduced)
                animations.push(heading.animate([
                    { opacity: 0, transform: "translateY(1rem)" },
                    { opacity: 1, transform: "translateY(0)" },
                ], { duration: 800, delay: 100, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }));
            void Promise.all(animations.map(animation => animation.finished)).then(finish, finish);
        }
        catch {
            finish();
        }
    };
    const blockScroll = (event) => { event.preventDefault(); };
    const onKeyDown = (event) => {
        if (event.key === "Escape")
            finish();
        else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "].includes(event.key))
            event.preventDefault();
    };
    const releaseInput = () => {
        for (const event of ["wheel", "touchmove"])
            window.removeEventListener(event, blockScroll);
        window.removeEventListener("keydown", onKeyDown);
    };
    try {
        locked = true;
        overlay.hidden = false;
        overlay.dataset.revealState = "waiting";
        overlay.dataset.revealManaged = "true";
        root.dataset.revealActive = "true";
        if (firstLoad)
            root.dataset.initialReveal = "waiting";
        releaseScroll = lockScroll();
        content.forEach(element => { element.inert = true; });
        deadline = setTimeout(finish, 6000);
        for (const event of ["wheel", "touchmove"])
            window.addEventListener(event, blockScroll, { passive: false });
        window.addEventListener("keydown", onKeyDown);
        if (firstLoad && root.dataset.coffeeFallback !== "true") {
            const remaining = MODEL_FALLBACK_AFTER_MS - performance.now();
            if (remaining <= 0)
                root.dataset.coffeeFallback = "true";
            else
                modelDeadline = setTimeout(() => {
                    if (!disposed && !finished)
                        root.dataset.coffeeFallback = "true";
                }, remaining);
        }
        let ready = Promise.resolve();
        if (firstLoad) {
            const main = document.querySelector("main");
            const video = main?.querySelector("[data-hero-video]");
            const image = video?.poster ? new Image() : main?.querySelector("img");
            if (video?.poster && image)
                image.src = video.poster;
            ready = Promise.allSettled([document.fonts?.ready, image?.decode?.()]);
        }
        const mediaReady = Promise.race([ready, new Promise(resolve => { mediaDeadline = setTimeout(resolve, 1200); })]);
        const loadingReady = firstLoad && home ? new Promise(resolve => { loadingDeadline = setTimeout(resolve, 450); }) : Promise.resolve();
        void Promise.all([mediaReady, loadingReady]).then(() => {
            clearTimeout(mediaDeadline);
            if (disposed || finished)
                return;
            frame = requestAnimationFrame(() => { frame = requestAnimationFrame(open); });
        }, finish);
    }
    catch {
        finish();
    }
    return {
        subscribe(callback) {
            if (opened || finished) {
                callback();
                return () => { };
            }
            callbacks.add(callback);
            return () => { callbacks.delete(callback); };
        },
        cancel() {
            finish();
            disposed = true;
        },
    };
}
function installPageRevealRuntime() {
    if (window.__lavuonReveal)
        return;
    const overlay = document.querySelector("[data-page-reveal][data-reveal-initial='true']");
    const expired = !!overlay && getComputedStyle(overlay).visibility === "hidden";
    const initial = overlay && !overlay.hidden && !expired ? startReveal(overlay, true, overlay.dataset.revealHome === "true") : undefined;
    if (!initial) {
        if (overlay)
            overlay.hidden = true;
        document.documentElement.dataset.initialReveal = "done";
        if (expired)
            document.documentElement.dataset.coffeeFallback = "true";
    }
    window.__lavuonReveal = {
        lockScroll,
        attach(element, firstLoad, home, onReady) {
            if (firstLoad && element === overlay) {
                if (!initial) {
                    onReady();
                    return () => { };
                }
                const unsubscribe = initial.subscribe(onReady);
                return () => { unsubscribe(); if (!element.isConnected)
                    initial.cancel(); };
            }
            const reveal = startReveal(element, firstLoad, home);
            const unsubscribe = reveal.subscribe(onReady);
            return () => { unsubscribe(); reveal.cancel(); };
        },
    };
    window.dispatchEvent(new Event("lavuon:reveal-runtime"));
}
if (typeof window !== "undefined")
    installPageRevealRuntime();

})({});
