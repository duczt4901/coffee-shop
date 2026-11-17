"use client";

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
        return enhanceWhenVisible(section, () => import("./coffee-experience-runtime").then(module => element => module.setupCoffeeExperience(element, modelRef)));
    }, []);

    return (
        <section ref={sectionRef} data-coffee-experience className={`${styles.experience} font-cormorant`}>
            <div data-coffee-scene className={styles.scene}>
                <div data-coffee-stage className={styles.stage}>
                    <div className={styles.openingTrack}>
                        <p data-display-copy className={`${styles.displayReveal} ${styles.openingCopy}`}>
                            <span className="block">Người buồn</span> <span className="block">cảnh có</span>
                        </p>
                    </div>
                    <CoffeeParallaxScene ref={modelRef} />
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
