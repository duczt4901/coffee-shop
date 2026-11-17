import { observeMotion, observeScroll } from "@/lib/native-motion";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import { splitWords } from "@/lib/split-words";
import { getTextRevealDelay, isRevealVisible, REVEAL } from "@/lib/reveal";
import styles from "./EditorialReveal.module.css";

const CONTENT_FRAMES = [
    { opacity: 0, transform: "translateY(16px)" },
    { opacity: 1, transform: "translateY(0)" },
];
const REVEALS = {
    words: [{ transform: "translateY(160%)" }, { transform: "translateY(0)" }],
    lines: CONTENT_FRAMES,
    block: CONTENT_FRAMES,
    border: [
        { transform: "scaleX(0)", transformOrigin: "left" },
        { transform: "scaleX(1)", transformOrigin: "left" },
    ],
    marker: [
        { transform: "scale(0) rotate(20deg)", transformOrigin: "left top" },
        { transform: "scale(1) rotate(0)", transformOrigin: "left top" },
    ],
};

export function setupEditorialReveal(scope: HTMLElement) {
    if (typeof scope.animate !== "function") return;

    return observeMotion("(prefers-reduced-motion: no-preference)", () => {
        const footerBoundary = scope.closest<HTMLElement>("[data-footer-reveal]");
        const animations: Animation[] = [];
        const splits: ReturnType<typeof splitWords>[] = [];
        // PageReveal owns H1 entry; word masks must not add a second heading animation.
        const targets = Array.from(scope.querySelectorAll<HTMLElement>("[data-reveal]")).filter((target) => target.closest("[data-editorial-reveal]") === scope && !target.closest("h1") && (target.dataset.reveal ?? "") in REVEALS);
        const pending = new Set(targets);
        let stop = () => {};
        const cleanup = () => {
            stop();
            window.removeEventListener("lavuon:reveal-done", sync);
            scope.removeEventListener("focusin", revealFocused);
            animations.forEach((animation) => animation.cancel());
            splits.forEach((split) => split.revert());
            targets.forEach((target) => target.removeAttribute("data-reveal-pending"));
            pending.clear();
        };
        const fail = (error: unknown) => {
            cleanup();
            console.error("Text reveal failed; keeping its content visible.", error);
        };

        const reveal = (target: HTMLElement, focused = false, sequenceDelay = 0) => {
            if (!pending.delete(target)) return;
            const mode = target.dataset.reveal as keyof typeof REVEALS;
            let parts = [target];
            // Keep offscreen text intact; allocate word masks and animations only when needed.
            if (mode === "words") {
                const split = splitWords(target, styles.word, styles.mask);
                splits.push(split);
                parts = split.words;
            }
            target.removeAttribute("data-reveal-pending");
            parts.forEach((part, wordIndex) => {
                const animation = part.animate(REVEALS[mode], {
                    duration: REVEAL.duration,
                    delay: sequenceDelay + getTextRevealDelay(target, mode, focused) + wordIndex * REVEAL.wordStagger,
                    easing: REVEAL.easing,
                    fill: "both",
                });
                animation.onfinish = () => {
                    animation.cancel();
                    if (mode === "words") part.parentElement?.classList.add(styles.finished);
                };
                animations.push(animation);
            });
        };
        const sync = () => {
            if (document.documentElement.dataset.revealActive === "true") return;
            const viewport = getScrollViewportHeight();
            const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
            const clip = footerBoundary?.getBoundingClientRect();
            let textIndex = 0;
            pending.forEach((target) => {
                const bounds = target.getBoundingClientRect();
                // The translated footer can enter the viewport while still hidden by its wrapper.
                const top = Math.max(bounds.top, clip?.top ?? bounds.top);
                const bottom = Math.min(bounds.top + bounds.height, clip?.bottom ?? bounds.top + bounds.height);
                if (!isRevealVisible({ top, height: Math.max(0, bottom - top) }, viewport, atPageEnd)) return;
                const decoration = target.dataset.reveal === "border" || target.dataset.reveal === "marker";
                reveal(target, false, decoration ? 0 : textIndex++ * REVEAL.textStagger);
            });
            if (!pending.size) stop();
        };
        const revealFocused = (event: FocusEvent) => {
            try {
                pending.forEach((target) => {
                    if (event.target instanceof Node && (target.contains(event.target) || target.closest("a, button, summary")?.contains(event.target))) reveal(target, true);
                });
                if (!pending.size) stop();
            } catch (error) {
                fail(error);
            }
        };
        try {
            targets.forEach((target) => target.setAttribute("data-reveal-pending", ""));
            window.addEventListener("lavuon:reveal-done", sync);
            stop = observeScroll(sync, fail);
            if (!pending.size) stop();
            scope.addEventListener("focusin", revealFocused);
        } catch (error) {
            fail(error);
        }
        return cleanup;
    });
}
