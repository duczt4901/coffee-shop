"use client";

import { useRef, type ReactElement } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useExperienceRuntime } from "./ExperienceRuntime";
import { LocalCoffeeModel } from "./coffee-bag/LocalCoffeeModel";
import styles from "./CoffeeBagExperience.module.css";

gsap.registerPlugin(ScrollTrigger, SplitText);

export function CoffeeBagExperience(): ReactElement {
    const sectionRef = useRef<HTMLElement>(null);
    const sceneRef = useRef<HTMLDivElement>(null);
    const modelRef = useRef<HTMLDivElement>(null);
    const copyRef = useRef<HTMLDivElement>(null);
    const { started } = useExperienceRuntime();

    useGSAP(
        () => {
            const section = sectionRef.current;
            const scene = sceneRef.current;
            const model = modelRef.current;
            const content = copyRef.current;
            if (!started || !section || !scene || !model || !content) return;

            const motion = gsap.matchMedia();
            motion.add("(prefers-reduced-motion: no-preference)", () => {
                section.classList.add(styles.animated);
                const copies = Array.from(section.querySelectorAll<HTMLElement>("[data-display-copy]"));
                const measureCopy = () => {
                    section.style.setProperty("--copy-height", `${content.offsetHeight}px`);
                };
                const copyResize = new ResizeObserver(measureCopy);
                copyResize.observe(content);
                measureCopy();
                let firstShown = false;
                const sync = () => {
                    const viewport = window.innerHeight;
                    const compact = window.innerWidth < 768 || viewport >= window.innerWidth;
                    const bounds = scene.getBoundingClientRect();
                    const modelBounds = model.getBoundingClientRect();
                    const firstSlot = copies[0].closest<HTMLElement>("[data-copy-slot]")!;
                    const entered = bounds.top <= viewport * (compact ? 0.35 : 0.5) - firstSlot.offsetHeight / 2;
                    const switched = modelBounds.top <= viewport * (compact ? 0.15 : 0.1);
                    const firstExited = modelBounds.top <= viewport * ((compact ? 0.15 : 0.1) - 0.15);
                    firstShown = firstShown || entered || switched;

                    section.classList.toggle(styles.sceneActive, bounds.top < viewport && bounds.bottom > 0);
                    copies[0].classList.toggle(styles.copyVisible, firstShown && !firstExited);
                    copies[0].classList.toggle(styles.copyAbove, firstExited);
                    copies[1].classList.toggle(styles.copyVisible, switched);
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
                            sync();
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
                sync();

                return () => {
                    copyResize.disconnect();
                    trigger.kill();
                    splits.forEach((split) => split.revert());
                    copies.forEach((copy) => {
                        copy.classList.remove(styles.copyVisible, styles.copyAbove);
                    });
                    section.classList.remove(styles.animated, styles.sceneActive);
                    section.style.removeProperty("--copy-height");
                };
            });

            return () => motion.revert();
        },
        { scope: sectionRef, dependencies: [started], revertOnUpdate: true },
    );

    return (
        <section ref={sectionRef} className={`${styles.experience} font-cormorant`}>
            <div ref={sceneRef} className={styles.scene}>
                <div data-copy-slot className={`${styles.firstSlot} ${styles.displayCopy}`}>
                    <div className={`${styles.copyTrack} ${styles.firstLayer}`}>
                        <div className={styles.screenLayer}>
                            <p data-display-copy className={`${styles.displayReveal} ${styles.displayCopy}`}>
                                <span className="block">Người buồn</span> <span className="block">cảnh có</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div ref={modelRef} className={styles.modelFrame}>
                    <LocalCoffeeModel />
                </div>

                <div data-copy-slot className={`${styles.secondSlot} ${styles.secondText}`}>
                    <div className={`${styles.copyTrack} ${styles.secondLayer}`}>
                        <div className={styles.screenLayer}>
                            <p data-display-copy className={`${styles.displayReveal} ${styles.secondText}`}>
                                <span className="block">Vui đâu bao giờ.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.copySurface}>
                <div ref={copyRef} className={`${styles.copy} min-w-0 text-center`}>
                    <h2 className="text-xl font-semibold leading-tight sm:text-2xl">Thân em vừa trắng lại vừa tròn, bảy nổi ba chìm với nước non.</h2>
                    <p className="mt-6 text-base leading-7 text-foreground/70">
                        Lom khom dưới núi, tiều vài chú, lác đác bên sông, chợ mấy nhà. Nhớ nước đau lòng con quốc quốc, thương nhà mỏi miệng cái gia gia. Dừng chân đứng lại trời, non, nước, một mảnh
                        tình riêng ta với ta.
                    </p>
                    <Link href="/san-pham/" className={styles.productsLink}>
                        Xem sản phẩm
                    </Link>
                </div>
            </div>
        </section>
    );
}
