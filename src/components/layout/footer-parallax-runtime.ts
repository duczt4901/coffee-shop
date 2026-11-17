import { observeMotion, observeScroll } from "@/lib/native-motion";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";

export function setupFooterParallax(wrapper: HTMLElement) {
    const footer = wrapper.querySelector<HTMLElement>("[data-site-footer]");
    if (!footer) return;
    return observeMotion("(min-width: 64rem) and (min-height: 38rem) and (prefers-reduced-motion: no-preference)", () => {
        const stop = observeScroll(() => {
            const progress = Math.max(0, Math.min(1, 1 - wrapper.getBoundingClientRect().top / getScrollViewportHeight()));
            footer.style.transform = `translateY(${(progress - 1) * 50}%)`;
        });
        return () => {
            stop();
            footer.style.removeProperty("transform");
        };
    });
}
