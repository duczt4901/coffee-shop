import type Lenis from "lenis";

declare global {
    interface Window {
        __lavuonLenis?: Lenis;
    }
}

export function getSmoothScroll() {
    return typeof window === "undefined" ? undefined : window.__lavuonLenis;
}
