"use client";

import { useCallback, useRef, type ReactElement } from "react";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useExperienceRuntime } from "./ExperienceRuntime";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import { LocalCoffeeModel, type CoffeeModelHandle } from "./coffee-bag/LocalCoffeeModel";
import styles from "./CoffeeBagExperience.module.css";

gsap.registerPlugin(ScrollTrigger, SplitText);

export function CoffeeBagExperience(): ReactElement {
    const sectionRef = useRef<HTMLElement>(null);
    const sceneRef = useRef<HTMLDivElement>(null);
    const modelRef = useRef<CoffeeModelHandle>(null);
    const { started } = useExperienceRuntime();
    const refreshLayout = useCallback(() => ScrollTrigger.refresh(), []);

    useGSAP(
        () => {
            const section = sectionRef.current;
            const scene = sceneRef.current;
            if (!started || !section || !scene) return;

            const motion = gsap.matchMedia();
            motion.add("(prefers-reduced-motion: no-preference)", () => {
                section.classList.add(styles.animated);
                const copies = Array.from(section.querySelectorAll<HTMLElement>("[data-display-copy]"));
                const closingTrack = copies[1].parentElement!;
                const sync = ({ progress }: { progress: number }) => {
                    modelRef.current?.setProgress(progress);
                    const viewport = getScrollViewportHeight();
                    // The track keeps moving after sticky text reaches its viewport anchor.
                    const closingTop = closingTrack.getBoundingClientRect().top;
                    const openingExited = closingTop <= viewport * 0.6;
                    const closingEntered = closingTop <= viewport * 0.7;
                    copies[0].classList.toggle(styles.copyVisible, !openingExited);
                    copies[0].classList.toggle(styles.copyAbove, openingExited);
                    copies[1].classList.toggle(styles.copyVisible, closingEntered);
                };

                const splits = copies.map((copy) =>
                    SplitText.create(copy, {
                        type: "lines,words",
                        linesClass: styles.revealLine,
                        wordsClass: styles.revealWord,
                        autoSplit: true,
                        onSplit: (text) => {
                            text.words.forEach((word, index) => {
                                (word as HTMLElement).style.setProperty("--word-index", String(index));
                            });
                        },
                    }),
                );

                const trigger = ScrollTrigger.create({
                    trigger: scene,
                    start: "top bottom",
                    end: "bottom top",
                    onUpdate: sync,
                    onRefresh: sync,
                });
                sync(trigger);

                return () => {
                    trigger.kill();
                    modelRef.current?.setProgress(0.5);
                    splits.forEach((split) => split.revert());
                    copies.forEach((copy) => {
                        copy.classList.remove(styles.copyVisible, styles.copyAbove);
                    });
                    section.classList.remove(styles.animated);
                };
            });

            return () => motion.revert();
        },
        { scope: sectionRef, dependencies: [started], revertOnUpdate: true },
    );

    return (
        <section ref={sectionRef} data-coffee-experience className={`${styles.experience} font-cormorant`}>
            <div ref={sceneRef} data-coffee-scene className={styles.scene}>
                <div data-coffee-stage className={styles.stage}>
                    <div className={styles.openingTrack}>
                        <p data-display-copy className={`${styles.displayReveal} ${styles.openingCopy}`}>
                            <span className="block">Người buồn</span> <span className="block">cảnh có</span>
                        </p>
                    </div>
                    <LocalCoffeeModel ref={modelRef} onLayout={refreshLayout} />
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
                            <p data-reveal="lines" data-reveal-at="0.25" className="mt-6 text-base leading-7 text-foreground/70">
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
