"use client";

import React, { useId, useLayoutEffect, useRef } from "react";
import { enhanceWhenVisible } from "@/lib/enhance-when-visible";
import { CoffeeProcessSlideshow } from "./CoffeeProcessSlideshow";
import styles from "./CoffeeOriginSection.module.css";

const MAP_ASSET = "/images/maps/south-vietnam-knockout.svg";

export function CoffeeOriginSection(): React.ReactElement {
    const sectionRef = useRef<HTMLElement>(null);
    const maskId = useId();
    const shapeId = `${maskId}-shape`;

    useLayoutEffect(() => {
        const root = sectionRef.current;
        if (!root) return;
        return enhanceWhenVisible(root, () => import("./coffee-origin-runtime").then(module => module.setupCoffeeOrigin));
    }, []);

    return (
        <section ref={sectionRef} data-coffee-origin className={`${styles.section} font-cormorant`}>
            <noscript><style>{"[data-coffee-origin]{height:var(--origin-stage)}"}</style></noscript>
            <div data-coffee-story-start className={styles.storyStart} aria-hidden="true" />

            <div className={styles.stickyViewport}>
                <CoffeeProcessSlideshow />

                <div className={styles.mapMask} hidden aria-hidden="true">
                    <div className={`${styles.edgeFade} ${styles.topFade}`} />
                    <svg className={styles.map} width="100%" height="100%" viewBox="0 0 1540 1240">
                        <defs>
                            <g id={shapeId}>
                                <use href={`${MAP_ASSET}#lam-dong`} />
                            </g>
                            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" style={{ maskType: "luminance" }}>
                                <rect width="100%" height="100%" fill="white" />
                                <use data-origin-shape href={`#${shapeId}`} fill="black" />
                            </mask>
                        </defs>
                        <rect width="100%" height="100%" fill="var(--background)" mask={`url(#${maskId})`} />
                        <g data-origin-borders>
                            <use href={`${MAP_ASSET}#province-context`} />
                        </g>
                        <use className={styles.provinceFill} href={`#${shapeId}`} />
                    </svg>
                    <div className={`${styles.edgeFade} ${styles.bottomFade}`} />
                </div>

                <div className={styles.introCopy} style={{ "--origin-text-mask": `url(#${maskId})` } as React.CSSProperties}>
                    <p className="text-xs uppercase tracking-[0.08em] sm:text-sm">
                        <em className="normal-case">trong </em> đầm <em className="normal-case">gì đẹp bằng</em> <b>sen</b>
                    </p>
                    <h2 className="mt-10 max-w-6xl text-center text-[clamp(2.25rem,11.5vw,3rem)] font-semibold uppercase leading-[0.86] tracking-[-0.055em] sm:mt-12 sm:text-[clamp(3.25rem,6.4vw,7.5rem)]">
                        <span className="block">
                            <em className="block normal-case sm:mr-[0.12em] font-normal sm:inline">lá xanh</em> bông trắng
                        </span>
                        <span className="block">
                            lại chen
                            <em className="block normal-case sm:mr-[0.12em] font-normal sm:inline">nhị vàng</em>
                        </span>
                    </h2>
                </div>
            </div>
        </section>
    );
}
