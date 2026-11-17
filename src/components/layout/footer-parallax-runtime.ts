import { observeMotion, observeScroll } from "@/lib/native-motion";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";

export function setupFooterParallax(wrapper: HTMLElement) {
    const footer = wrapper.querySelector<HTMLElement>("[data-site-footer]");
    if (!footer) return;
    if (typeof CSS !== "undefined" && CSS.supports("(animation-timeline: view()) and (animation-range: entry)")) return;
    return observeMotion("(prefers-reduced-motion: no-preference)", () => {
        const stop = observeScroll(() => {
            const bounds = wrapper.getBoundingClientRect();
            const viewport = getScrollViewportHeight();
            const progress = Math.max(0, Math.min(1, (viewport - bounds.top) / Math.max(1, Math.min(viewport, bounds.height || viewport))));
            footer.style.transform = `translateY(${(progress - 1) * 50}%)`;
        });
        return () => {
            stop();
            footer.style.removeProperty("transform");
        };
    });
}
