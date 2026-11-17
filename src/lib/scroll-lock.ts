import { getSmoothScroll } from "./smooth-scroll";

export function lockScroll() {
    const runtime = typeof window === "undefined" ? undefined : window.__lavuonReveal;
    if (runtime) return runtime.lockScroll();

    // Keep the native menu usable even if the early reveal script failed to load.
    const root = document.documentElement;
    const state: NonNullable<Window["__lavuonScrollLocks"]> = typeof window === "undefined" ? { count: 0 } : window.__lavuonScrollLocks ??= { count: 0 };
    if (state.count === 0) {
        const overflow = root.style.overflow;
        const lenis = getSmoothScroll();
        const stoppedHere = lenis && !lenis.isStopped;
        const restore = () => {
            root.style.overflow = overflow;
            if (stoppedHere && getSmoothScroll() === lenis) lenis.start();
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
