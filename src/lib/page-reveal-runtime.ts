export type PageRevealRuntime = {
    attach(overlay: HTMLElement, firstLoad: boolean, home: boolean, onReady: () => void): () => void;
    lockScroll(): () => void;
    ownsEntry?(element: Element): boolean;
    prepareContent?(scope: HTMLElement): HTMLElement[];
    revealMode?(element: HTMLElement): string;
};

declare global {
    interface Window {
        __lavuonReveal?: PageRevealRuntime;
        __lavuonScrollLocks?: { count: number; restore?: () => void };
    }
}

const MODEL_FALLBACK_AFTER_MS = 5000;
const enteredContent = new WeakSet<Element>();
const ownsEntry = (element: Element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
        if (enteredContent.has(node)) return true;
    }
    return false;
};
const revealMode = (element: HTMLElement) => element.dataset.reveal ?? (element.tagName === "HR" ? "border" : /^H[1-6]$/.test(element.tagName) ? "words" : "lines");

// Discover static copy once, never on scroll or when a live value changes.
function prepareContent(scope: HTMLElement) {
    const candidates = "[data-reveal], h1, h2, h3, h4, h5, h6, p, dt, dd, label, address, figcaption, button, summary, a, li, span, hr";
    const selected = new Set<HTMLElement>();
    return Array.from(scope.querySelectorAll<HTMLElement>(candidates)).filter(target => {
        const decoration = target.dataset.reveal === "border" || target.dataset.reveal === "marker" || target.tagName === "HR";
        if (target.closest("[data-reveal-skip], [data-hero-brand], [data-display-copy], [data-coffee-origin], [data-site-header], [data-site-menu], [aria-live], [role='status'], [role='alert'], [hidden], noscript, svg *, [role='listbox'], [role='option']")) return false;
        if (!decoration && (target.closest("[aria-hidden='true'], .sr-only") || (!target.dataset.reveal && !target.textContent?.trim()))) return false;
        if (target.parentElement?.closest("[data-reveal]")) return false;
        for (let parent = target.parentElement; parent && parent !== scope; parent = parent.parentElement) {
            if (selected.has(parent)) return false;
        }
        const details = target.closest("details");
        if (details && !details.open && !target.closest("summary")) return false;
        if (!target.dataset.reveal) {
            // Containers with their own paragraphs/headings leave those children independent.
            if (target.querySelector("h1, h2, h3, h4, h5, h6, p, dt, dd, [data-reveal], [data-editorial-reveal], input, select, textarea")) return false;
        }
        selected.add(target);
        return true;
    });
}
function lockScroll() {
    const root = document.documentElement;
    const state = window.__lavuonScrollLocks ??= { count: 0 };
    if (state.count === 0) {
        const overflow = root.style.overflow;
        const lenis = window.__lavuonLenis;
        const stoppedHere = lenis && !lenis.isStopped;
        const restore = () => {
            root.style.overflow = overflow;
            if (stoppedHere && window.__lavuonLenis === lenis) lenis.start();
        };
        try {
            root.style.overflow = "hidden";
            if (stoppedHere) lenis.stop();
            state.restore = restore;
        } catch (error) {
            restore();
            throw error;
        }
    }
    state.count++;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        if (--state.count === 0) { state.restore?.(); state.restore = undefined; }
    };
}

function startReveal(overlay: HTMLElement, firstLoad: boolean, home: boolean) {
    const curtain = overlay.querySelector<HTMLElement>("[data-reveal-curtain]");
    let opened = false;
    const callbacks = new Set<() => void>();
    const notify = () => { opened = true; callbacks.forEach(callback => callback()); };
    let disposed = false;
    let finished = false;
    let frame = 0;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let mediaDeadline: ReturnType<typeof setTimeout> | undefined;
    let loadingDeadline: ReturnType<typeof setTimeout> | undefined;
    let modelDeadline: ReturnType<typeof setTimeout> | undefined;
    const animations: Animation[] = [];
    const entryAnimations: Animation[] = [];
    let keepEntryAnimations = false;
    const cancelEntries = () => entryAnimations.forEach(animation => animation.cancel());
    const root = document.documentElement;
    const content = Array.from(document.querySelectorAll<HTMLElement>("[data-site-content]"));
    const previousInert = content.map(element => element.inert);
    let locked = false;
    let releaseScroll: (() => void) | undefined;
    const cancelAnimations = () => animations.forEach(animation => {
        void animation.finished.catch(() => {});
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
        if (disposed || finished) return;
        finished = true;
        clearTimeout(deadline);
        clearTimeout(mediaDeadline);
        clearTimeout(loadingDeadline);
        clearTimeout(modelDeadline);
        if (firstLoad && performance.now() >= MODEL_FALLBACK_AFTER_MS) root.dataset.coffeeFallback = "true";
        cancelAnimationFrame(frame);
        // Hide before cancelling fill animations so the cover cannot flash back.
        overlay.hidden = true;
        root.dataset.revealActive = "false";
        if (firstLoad) root.dataset.initialReveal = "done";
        cancelAnimations();
        if (!keepEntryAnimations) cancelEntries();
        releaseInput();
        unlock();
        notify();
        overlay.dataset.revealState = "done";
        window.dispatchEvent(new Event("lavuon:reveal-done"));
    };
    const open = () => {
        if (disposed || finished) return;
        overlay.dataset.revealState = "opening";
        notify();
        try {
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (!home) {
                // Prepare visible copy and media; never transform main or a scroll owner.
                if (!reduced) {
                    const main = document.querySelector<HTMLElement>("main");
                    const groups = (main ? prepareContent(main) : []).filter(element => {
                        const bounds = element.getBoundingClientRect();
                        return bounds.width > 0 && bounds.height > 0 && bounds.top < window.innerHeight && bounds.bottom > 0;
                    });
                    groups.forEach((element, index) => {
                        enteredContent.add(element);
                        const decoration = revealMode(element) === "border";
                        const step = element.closest<HTMLElement>("[data-reveal-step]")?.dataset.revealStep;
                        const delay = step === undefined ? Math.min(index, 5) * 100 : Number(step) * 180;
                        const animation = element.animate(decoration ? [
                            { transform: "scaleX(0)", transformOrigin: "left" },
                            { transform: "scaleX(1)", transformOrigin: "left" },
                        ] : [
                            { opacity: 0, transform: "translateY(1rem) scale(0.975)" },
                            { opacity: 1, transform: "translateY(0) scale(1)" },
                        ], { duration: 1600, delay: 200 + delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" });
                        entryAnimations.push(animation);
                        void animation.finished.then(() => animation.cancel(), () => {});
                    });
                    // Release editorial masks before fading the cover, including early hydration.
                    window.dispatchEvent(new Event("lavuon:entry-ready"));
                    const header = document.querySelector<HTMLElement>("[data-site-header]");
                    if (header) animations.push(header.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 100, easing: "ease-out", fill: "both" }));
                }
                const cover = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
                    duration: reduced ? 100 : 800, easing: "cubic-bezier(0.3, 0, 0.3, 1)", fill: "both",
                });
                animations.push(cover);
                // Input returns when the cover leaves; content finishes without extending the lock.
                void cover.finished.then(() => { keepEntryAnimations = true; finish(); }, finish);
                return;
            }
            // Reveal the entire viewport with one surface, including restored scroll positions.
            if (home && !reduced && curtain) animations.push(curtain.animate([
                { clipPath: "inset(0 0 0% 0)" },
                { clipPath: "inset(0 0 100% 0)" },
            ], { duration: 900, easing: "cubic-bezier(0.76, 0, 0.24, 1)", fill: "both" }));
            else animations.push(overlay.animate(reduced ? [{ opacity: 1 }, { opacity: 0 }] : [
                { transform: "translateY(0%)" },
                { transform: "translateY(-100%)" },
            ], {
                duration: reduced ? 100 : 600, easing: "cubic-bezier(0.3, 0, 0.3, 1)", fill: "both",
            }));
            const brand = overlay.querySelector<HTMLElement>("[data-reveal-brand]");
            const heroBrand = document.querySelector<HTMLElement>("[data-hero-brand]");
            const logo = heroBrand?.querySelector<SVGSVGElement>("[data-brand-mark]");
            const from = brand?.getBoundingClientRect();
            const to = logo?.getBoundingClientRect();
            const handoff = home && !reduced && brand && logo && from?.width && to?.width && to.top + to.height > 0 && to.top < window.innerHeight;
            if (handoff) {
                const x = to.left + to.width / 2 - from.left - from.width / 2;
                const y = to.top + to.height / 2 - from.top - from.height / 2;
                animations.push(brand.animate([
                    { transform: "translate(-50%, -50%) scale(1)" },
                    { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${to.width / from.width})` },
                ], { duration: 900, easing: "cubic-bezier(0.76, 0, 0.24, 1)", fill: "both" }));
                animations.push(logo.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 900, fill: "both" }));
            } else if (brand && !reduced) animations.push(brand.animate([
                { opacity: 1 }, { opacity: 0 },
            ], { duration: 450, easing: "ease-in", fill: "both" }));
            const header = document.querySelector<HTMLElement>("[data-site-header]");
            if (header && !reduced) animations.push(header.animate(home ? [
                { opacity: 0, filter: "blur(4px)" },
                { opacity: 1, filter: "blur(0px)" },
            ] : [
                { opacity: 0 },
                { opacity: 1 },
            ], { duration: 500, delay: home ? 300 : 100, easing: "ease-out", fill: "both" }));
            if (heroBrand && !reduced && to && to.top + to.height > 0 && to.top < window.innerHeight) {
                if (logo && !handoff) animations.push(logo.animate([
                    { opacity: 0, transform: "translateY(1rem)" },
                    { opacity: 1, transform: "translateY(0)" },
                ], { duration: 700, delay: 450, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }));
                // Start text after the curtain has uncovered the hero, including on the first visit.
                Array.from(heroBrand.querySelectorAll<HTMLElement>("[data-brand-text]")).forEach((line, index) => animations.push(line.animate([
                    { opacity: 0, transform: "translateY(1rem)" },
                    { opacity: 1, transform: "translateY(0)" },
                ], { duration: 700, delay: 550 + index * 80, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" })));
            }
            void Promise.all(animations.map(animation => animation.finished)).then(finish, finish);
        } catch {
            finish();
        }
    };

    const blockScroll = (event: Event) => { event.preventDefault(); };
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") finish();
        else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) event.preventDefault();
    };
    const releaseInput = () => {
        for (const event of ["wheel", "touchmove"]) window.removeEventListener(event, blockScroll);
        window.removeEventListener("keydown", onKeyDown);
    };

    try {
        locked = true;
        overlay.hidden = false;
        overlay.dataset.revealState = "waiting";
        overlay.dataset.revealManaged = "true";
        root.dataset.revealActive = "true";
        if (firstLoad) root.dataset.initialReveal = "waiting";
        releaseScroll = lockScroll();
        content.forEach(element => { element.inert = true; });
        deadline = setTimeout(finish, 6000);
        for (const event of ["wheel", "touchmove"]) window.addEventListener(event, blockScroll, { passive: false });
        window.addEventListener("keydown", onKeyDown);
        if (firstLoad && root.dataset.coffeeFallback !== "true") {
            // Count from navigation, including time spent waiting for hydration on a slow CPU.
            const remaining = MODEL_FALLBACK_AFTER_MS - performance.now();
            if (remaining <= 0) root.dataset.coffeeFallback = "true";
            else modelDeadline = setTimeout(() => {
                if (!disposed && !finished) root.dataset.coffeeFallback = "true";
            }, remaining);
        }
        // Only fonts and the first image/poster are essential; 3D and video playback can finish later.
        let ready: Promise<unknown> = Promise.resolve();
        if (firstLoad) {
            const main = document.querySelector("main");
            const video = main?.querySelector<HTMLVideoElement>("[data-hero-video]");
            const image = video?.poster ? new Image() : main?.querySelector<HTMLImageElement>("img");
            if (video?.poster && image) image.src = video.poster;
            ready = Promise.allSettled([document.fonts?.ready, image?.decode?.()]);
        }
        const mediaReady = Promise.race([ready, new Promise(resolve => { mediaDeadline = setTimeout(resolve, 1200); })]);
        // Keep the loading state readable even when fonts and poster are already cached.
        const loadingReady = firstLoad && home ? new Promise(resolve => { loadingDeadline = setTimeout(resolve, 450); }) : Promise.resolve();
        void Promise.all([mediaReady, loadingReady]).then(() => {
            clearTimeout(mediaDeadline);
            if (disposed || finished) return;
            frame = requestAnimationFrame(() => { frame = requestAnimationFrame(open); });
        }, finish);
    } catch {
        finish();
    }
    return {
        subscribe(callback: () => void) {
            if (opened || finished) { callback(); return () => {}; }
            callbacks.add(callback);
            return () => { callbacks.delete(callback); };
        },
        cancel() {
            cancelEntries();
            finish();
            disposed = true;
        },
    };
}

export function installPageRevealRuntime() {
    if (window.__lavuonReveal) return;
    const overlay = document.querySelector<HTMLElement>("[data-page-reveal][data-reveal-initial='true']");
    const expired = !!overlay && getComputedStyle(overlay).visibility === "hidden";
    const initial = overlay && !overlay.hidden && !expired ? startReveal(overlay, true, overlay.dataset.revealHome === "true") : undefined;
    if (!initial) {
        if (overlay) overlay.hidden = true;
        document.documentElement.dataset.initialReveal = "done";
        if (expired) {
            document.documentElement.dataset.coffeeFallback = "true";
            // The CSS escape already exposed this copy; late hydration must not hide it again.
            const main = document.querySelector<HTMLElement>("main");
            if (main) prepareContent(main).forEach(element => {
                const bounds = element.getBoundingClientRect();
                if (bounds.width > 0 && bounds.height > 0 && bounds.top < window.innerHeight && bounds.bottom > 0) enteredContent.add(element);
            });
        }
    }
    window.__lavuonReveal = {
        lockScroll,
        ownsEntry,
        prepareContent,
        revealMode,
        attach(element, firstLoad, home, onReady) {
            if (firstLoad && element === overlay) {
                if (!initial) { onReady(); return () => {}; }
                const unsubscribe = initial.subscribe(onReady);
                return () => { unsubscribe(); if (!element.isConnected) initial.cancel(); };
            }
            const reveal = startReveal(element, firstLoad, home);
            const unsubscribe = reveal.subscribe(onReady);
            return () => { unsubscribe(); reveal.cancel(); };
        },
    };
    window.dispatchEvent(new Event("lavuon:reveal-runtime"));
}

if (typeof window !== "undefined") installPageRevealRuntime();
