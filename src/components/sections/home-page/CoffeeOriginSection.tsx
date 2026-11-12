"use client";

import React, { useId, useLayoutEffect, useRef } from "react";
import { observeScroll } from "@/lib/native-motion";
import { CoffeeProcessSlideshow, setupCoffeeProcessSlideshow } from "./CoffeeProcessSlideshow";
import styles from "./CoffeeOriginSection.module.css";

// This point has an 83-unit clear radius inside the unchanged Lâm Đồng outline.
const MAP_ANCHOR = { x: 770, y: 755, radius: 83 };
const MAP_ASSET = "/images/maps/south-vietnam-knockout.svg";

export function CoffeeOriginSection(): React.ReactElement {
    const sectionRef = useRef<HTMLElement>(null);
    const maskId = useId();
    const shapeId = `${maskId}-shape`;

    useLayoutEffect(() => {
        const root = sectionRef.current;
        if (!root) return;

        const copy = root.querySelector<HTMLElement>(`.${styles.introCopy}`);
        const location = root.querySelector<HTMLElement>(`.${styles.locationLabel}`);
        const viewport = root.querySelector<SVGSVGElement>(`.${styles.map}`);
        const shape = root.querySelector<SVGUseElement>("[data-origin-shape]");
        const borders = root.querySelector<SVGGElement>("[data-origin-borders]");
        const fill = root.querySelector<SVGUseElement>(`.${styles.provinceFill}`);
        const edgeFades = root.querySelectorAll<HTMLElement>(`.${styles.edgeFade}`);
        const storyStart = root.querySelector<HTMLElement>("[data-coffee-story-start]");
        if (!copy || !location || !viewport || !shape || !borders || !fill || !storyStart) return;

        let stop = () => {};
        let story: ReturnType<typeof setupCoffeeProcessSlideshow> | undefined;
        let mapImage: HTMLImageElement | undefined;
        let disposed = false;
        let baselineViewed = false;
        const stopTracking = () => {
            window.removeEventListener("scroll", rememberViewed);
            window.removeEventListener("resize", rememberViewed);
        };
        const rememberViewed = () => {
            if (root.getBoundingClientRect().top < window.innerHeight) {
                baselineViewed = true;
                stopTracking();
            }
        };
        const cleanup = () => {
            stopTracking();
            if (mapImage) {
                mapImage.onload = null;
                mapImage.onerror = null;
            }
            stop();
            root.removeAttribute("data-origin-enhanced");
            story?.cleanup();
            viewport.setAttribute("viewBox", "0 0 1540 1240");
            shape.removeAttribute("transform");
            fill.removeAttribute("transform");
            borders.removeAttribute("transform");
            [copy, location, fill, borders, ...edgeFades].forEach((element) => {
                element.style.removeProperty("opacity");
            });
        };
        const clamp = (value: number) => Math.max(0, Math.min(1, value));
        let lastWidth = 0;
        let lastHeight = 0;
        const activate = () => {
            if (disposed) return;
            rememberViewed();
            stopTracking();
            // Never replace a story the user has started reading with a pinned stage.
            if (baselineViewed) return cleanup();
            try {
                story = setupCoffeeProcessSlideshow(root);
                root.setAttribute("data-origin-enhanced", "");
                viewport.removeAttribute("viewBox");
                stop = observeScroll(() => {
                    const compact = window.matchMedia("(max-width: 63.999rem)").matches;
                    const progress = clamp(-root.getBoundingClientRect().top / Math.max(1, storyStart.offsetTop));
                    const width = viewport.clientWidth;
                    const height = viewport.clientHeight;
                    if (!width || !height) throw new Error("Coffee origin viewport is not ready");
                    const centerX = width * 0.5;
                    const centerY = height * 0.61;
                    const initialScale = compact ? Math.min((width * 0.55) / 290, (height * 0.34) / 370) : Math.min(width / 2400, height / 1200) * 0.828 * 1.12;
                    // The enclosing circle covers every corner, including through the outline's concave edges.
                    const finalScale = (Math.hypot(width * 0.5, Math.max(centerY, height - centerY)) / MAP_ANCHOR.radius) * 1.02;
                    const matrix = (scale: number) => `matrix(${scale},0,0,${scale},${centerX - MAP_ANCHOR.x * scale},${centerY - MAP_ANCHOR.y * scale})`;
                    const scale = initialScale + (finalScale - initialScale) * progress;
                    shape.setAttribute("transform", matrix(scale));
                    fill.setAttribute("transform", matrix(scale));
                    if (width !== lastWidth || height !== lastHeight) borders.setAttribute("transform", matrix(initialScale));
                    // Temporarily disabled: province borders must not zoom with scrolling.
                    // borders.setAttribute("transform", matrix(scale));
                    lastWidth = width;
                    lastHeight = height;
                    [copy, fill, borders, ...edgeFades].forEach((element) => {
                        element.style.opacity = String(1 - progress);
                    });
                    location.style.opacity = String(1 - progress);
                    story?.update();
                }, cleanup);
            } catch {
                cleanup();
            }
        };
        try {
            window.addEventListener("scroll", rememberViewed, { passive: true });
            window.addEventListener("resize", rememberViewed);
            rememberViewed();
            // A missing external SVG must never turn the mask into a solid cover.
            mapImage = new Image();
            mapImage.onload = activate;
            mapImage.onerror = cleanup;
            mapImage.src = MAP_ASSET;
        } catch {
            cleanup();
        }
        return () => {
            disposed = true;
            cleanup();
        };
    }, []);

    return (
        <section ref={sectionRef} data-coffee-origin className={`${styles.section} font-cormorant`}>
            <div data-coffee-story-start className={styles.storyStart} aria-hidden="true" />

            <div className={styles.stickyViewport}>
                <CoffeeProcessSlideshow />

                <div className={styles.mapMask} aria-hidden="true">
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

                <p className={styles.locationLabel}>Lâm Đồng</p>

                <div className={styles.introCopy}>
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
