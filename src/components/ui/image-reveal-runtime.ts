import { observeMotion, observeScroll } from "@/lib/native-motion";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import { isRevealVisible } from "@/lib/reveal";
import styles from "./ImageReveal.module.css";

export function setupImageReveal(root: HTMLElement, parallax: number, revealedRef: { current: boolean }) {
    const layer = root.querySelector<HTMLElement>("[data-image-reveal-layer]");
    if (!layer) return;

    return observeMotion("(prefers-reduced-motion: no-preference)", () => {
        const update = () => {
            const { top, height } = root.getBoundingClientRect();
            if (!height) return;
            const viewport = getScrollViewportHeight();
            const inView = top < viewport + 100 && top + height > -100;
            root.classList.toggle(styles.inView, inView);
            // Measure the frame directly: its own clip-path must not gate its reveal.
            const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
            if (!revealedRef.current && isRevealVisible({ top, height }, viewport, atPageEnd)) {
                revealedRef.current = true;
                root.classList.add(styles.revealed);
            }
            if (!inView) {
                layer.style.removeProperty("transform");
                return;
            }
            const progress = Math.max(0, Math.min(1, (viewport - top) / (viewport + height)));
            const range = Math.max(0, parallax);
            layer.style.transform = `translate3d(0, ${(progress - 0.5) * range}px, 0) scale(${1 + range / height})`;
        };
        if (!revealedRef.current) root.classList.add(styles.animated);
        const stop = observeScroll(update);
        return () => {
            stop();
            root.classList.remove(styles.inView, styles.animated, styles.revealed);
            layer.style.removeProperty("transform");
        };
    });
}
