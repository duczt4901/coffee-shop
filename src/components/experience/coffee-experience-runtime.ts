import { observeScroll } from "@/lib/native-motion";
import { splitWords } from "@/lib/split-words";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import type { CoffeeParallaxHandle } from "./CoffeeParallaxScene";
import styles from "./CoffeeBagExperience.module.css";

export function setupCoffeeExperience(section: HTMLElement, modelRef: { current: CoffeeParallaxHandle | null }) {
    const model = modelRef.current;
    const scene = section.querySelector<HTMLElement>("[data-coffee-scene]");
    if (!scene) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    section.classList.add(styles.animated);
    const copies = Array.from(section.querySelectorAll<HTMLElement>("[data-display-copy]"));
    const closingTrack = copies[1].parentElement!;
    const sync = () => {
        const bounds = scene.getBoundingClientRect();
        const viewport = getScrollViewportHeight();
        const progress = Math.max(0, Math.min(1, (viewport - bounds.top) / (viewport + bounds.height)));
        if (!reducedMotion.matches) modelRef.current?.setProgress(progress);
        // The track keeps moving after sticky text reaches its viewport anchor.
        const closingTop = closingTrack.getBoundingClientRect().top;
        const openingExited = closingTop <= viewport * 0.6;
        const closingEntered = closingTop <= viewport * 0.7;
        copies[0].classList.toggle(styles.copyVisible, !openingExited);
        copies[0].classList.toggle(styles.copyAbove, openingExited);
        copies[1].classList.toggle(styles.copyVisible, closingEntered);
    };

    const splits = copies.map((copy) => {
        const split = splitWords(copy, styles.revealWord, styles.revealLine);
        split.words.forEach((word, index) => word.style.setProperty("--word-index", String(index)));
        return split;
    });
    const stop = observeScroll(sync);
    const updateMotion = () => {
        if (reducedMotion.matches) modelRef.current?.setProgress(0.5);
        sync();
    };
    reducedMotion.addEventListener("change", updateMotion);

    return () => {
        stop();
        reducedMotion.removeEventListener("change", updateMotion);
        model?.setProgress(0.5);
        splits.forEach((split) => split.revert());
        copies.forEach((copy) => {
            copy.classList.remove(styles.copyVisible, styles.copyAbove);
        });
        section.classList.remove(styles.animated);
    };
}
