"use client";

import { useLayoutEffect, useRef, type ReactElement } from "react";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import { observeScroll } from "@/lib/native-motion";
import { splitWords } from "@/lib/split-words";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import { LocalCoffeeModel, type CoffeeModelHandle } from "./coffee-bag/LocalCoffeeModel";
import styles from "./CoffeeBagExperience.module.css";

export function CoffeeBagExperience(): ReactElement {
    const sectionRef = useRef<HTMLElement>(null);
    const sceneRef = useRef<HTMLDivElement>(null);
    const modelRef = useRef<CoffeeModelHandle>(null);

    useLayoutEffect(() => {
        const section = sectionRef.current;
        const scene = sceneRef.current;
        const model = modelRef.current;
        if (!section || !scene) return;

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
    }, []);

    return (
        <section ref={sectionRef} data-coffee-experience className={`${styles.experience} font-cormorant`}>
            <div ref={sceneRef} data-coffee-scene className={styles.scene}>
                <div data-coffee-stage className={styles.stage}>
                    <div className={styles.openingTrack}>
                        <p data-display-copy className={`${styles.displayReveal} ${styles.openingCopy}`}>
                            <span className="block">Người buồn</span> <span className="block">cảnh có</span>
                        </p>
                    </div>
                    <LocalCoffeeModel ref={modelRef} />
                    <div className={styles.closingTrack}>
                        <p data-display-copy className={`${styles.displayReveal} ${styles.closingCopy}`}>
                            <span className="block">Vui đâu bao giờ.</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.copySurface}>
                <div className={`${styles.copy} min-w-0 text-center`}>
                    <EditorialReveal>
                        <div>
                            <h2 data-reveal="words" className="text-xl font-semibold leading-tight sm:text-2xl">
                                Thân em vừa trắng lại vừa tròn, bảy nổi ba chìm với nước non.
                            </h2>
                            <p data-reveal="lines" className="mt-6 text-base leading-7 text-foreground/70">
                                Lom khom dưới núi, tiều vài chú, lác đác bên sông, chợ mấy nhà. Nhớ nước đau lòng con quốc quốc, thương nhà mỏi miệng cái gia gia. Dừng chân đứng lại trời, non, nước,
                                một mảnh tình riêng ta với ta.
                            </p>
                        </div>
                    </EditorialReveal>
                    <RevealLink href="/san-pham/" className="mt-8">
                        Xem sản phẩm
                    </RevealLink>
                </div>
            </div>
        </section>
    );
}
