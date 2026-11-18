"use client";
import { homeContent as content } from "@/data/page-content";

import { useLayoutEffect, useRef, type ReactElement } from "react";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import { enhanceWhenVisible } from "@/lib/enhance-when-visible";
import { CoffeeParallaxScene, type CoffeeParallaxHandle } from "./CoffeeParallaxScene";
import styles from "./CoffeeBagExperience.module.css";

export function CoffeeBagExperience(): ReactElement {
    const sectionRef = useRef<HTMLElement>(null);
    const modelRef = useRef<CoffeeParallaxHandle>(null);

    useLayoutEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        return enhanceWhenVisible(section, () => import("./coffee-experience-runtime").then((module) => (element) => module.setupCoffeeExperience(element, modelRef)));
    }, []);

    return (
        <section ref={sectionRef} data-coffee-experience className={`${styles.experience} font-cormorant`}>
            <div data-coffee-scene className={styles.scene}>
                <div data-coffee-stage className={styles.stage}>
                    <div className={styles.openingTrack}>
                        <p data-display-copy className={`${styles.displayReveal} ${styles.openingCopy}`}>
                            <span className="block">{content.bag_span_1}</span> <span className="block">{content.bag_span_2}</span>
                        </p>
                    </div>
                    <CoffeeParallaxScene ref={modelRef} />
                    <div className={styles.closingTrack}>
                        <p data-display-copy className={`${styles.displayReveal} ${styles.closingCopy}`}>
                            <span className="block">{content.bag_span_3}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.copySurface}>
                <div className={`${styles.copy} min-w-0 text-center`}>
                    <EditorialReveal>
                        <div>
                            <h2 data-reveal="words" className="text-xl font-semibold leading-tight sm:text-2xl">
                                {content.bag_h2_1}
                            </h2>
                            <p data-reveal="lines" className="mt-6 text-base leading-7 text-foreground/70">
                                {content.bag_p_1}
                            </p>
                        </div>
                    </EditorialReveal>
                    <RevealLink href="/san-pham/" className="mt-8">
                        {content.bag_reveallink_1}
                    </RevealLink>
                </div>
            </div>
        </section>
    );
}
