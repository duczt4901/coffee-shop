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
        const viewport = root.querySelector<SVGSVGElement>(`.${styles.map}`);
        const stage = root.querySelector<HTMLElement>(`.${styles.stickyViewport}`);
        const shape = root.querySelector<SVGUseElement>("[data-origin-shape]");
        const borders = root.querySelector<SVGGElement>("[data-origin-borders]");
        const fill = root.querySelector<SVGUseElement>(`.${styles.provinceFill}`);
        const edgeFades = root.querySelectorAll<HTMLElement>(`.${styles.edgeFade}`);
        const mask = root.querySelector<HTMLElement>(`.${styles.mapMask}`);
        const storyStart = root.querySelector<HTMLElement>("[data-coffee-story-start]");
        if (!viewport || !stage || !shape || !borders || !fill || !mask || !storyStart) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let disposed = false;
        let mapReady = false;
        let mapImage: HTMLImageElement | undefined;
        let resizeObserver: ResizeObserver | undefined;
        let story: ReturnType<typeof setupCoffeeProcessSlideshow> | undefined;
        let stop = () => {};
        let geometry: ReturnType<typeof measure> | undefined;
        let lastMapProgress = -1;
        let lastPin = "";
        const clamp = (value: number) => Math.max(0, Math.min(1, value));

        function measure(sectionHeight: number) {
            const width = stage!.clientWidth;
            const height = stage!.clientHeight;
            const start = storyStart!.offsetTop;
            if (!width || !height || !start) return;
            const compact = window.matchMedia("(max-width: 63.999rem)").matches;
            const centerX = width * 0.5;
            const centerY = height * 0.61;
            const initialScale = compact ? Math.min((width * 0.55) / 290, (height * 0.34) / 370) : Math.min(width / 2400, height / 1200) * 0.828 * 1.12;
            const finalScale = (Math.hypot(width * 0.5, Math.max(centerY, height - centerY)) / MAP_ANCHOR.radius) * 1.02;
            return { width, height, start, range: Math.max(1, sectionHeight - height - start), centerX, centerY, initialScale, finalScale };
        }
        const disableMap = () => {
            mapReady = false;
            mask.hidden = true;
            root.removeAttribute("data-origin-map-ready");
        };
        const cleanup = () => {
            if (disposed) return;
            disposed = true;
            stop();
            resizeObserver?.disconnect();
            window.removeEventListener("resize", remeasure);
            window.removeEventListener("pageshow", remeasure);
            reducedMotion.removeEventListener("change", remeasure);
            if (mapImage) {
                mapImage.onload = null;
                mapImage.onerror = null;
            }
            disableMap();
            root.removeAttribute("data-origin-enhanced");
            root.removeAttribute("data-origin-pin");
            story?.cleanup();
            viewport.setAttribute("viewBox", "0 0 1540 1240");
            shape.removeAttribute("transform");
            fill.removeAttribute("transform");
            borders.removeAttribute("transform");
            [fill, borders, ...edgeFades].forEach(element => element.style.removeProperty("opacity"));
        };
        const sync = () => {
            if (disposed) return;
            const bounds = root.getBoundingClientRect();
            const geometryChanged = !geometry;
            geometry ??= measure(bounds.height);
            if (!geometry) return;
            const { width, height, start, range, centerX, centerY, initialScale, finalScale } = geometry;
            const distance = -bounds.top - start;
            const progress = clamp(-bounds.top / start);
            story!.update({ progress: clamp(distance / range), width, visible: distance >= 0, reducedMotion: reducedMotion.matches });
            const pin = bounds.top > 0 ? "before" : -bounds.top < bounds.height - height ? "active" : "after";
            if (pin !== lastPin) {
                root.setAttribute("data-origin-pin", pin);
                lastPin = pin;
            }
            if (!mapReady || reducedMotion.matches) {
                mask.hidden = true;
                return;
            }
            if (progress === lastMapProgress && !geometryChanged) return;
            try {
                const matrix = (scale: number) => `matrix(${scale},0,0,${scale},${centerX - MAP_ANCHOR.x * scale},${centerY - MAP_ANCHOR.y * scale})`;
                const scale = initialScale + (finalScale - initialScale) * progress;
                shape.setAttribute("transform", matrix(scale));
                fill.setAttribute("transform", matrix(scale));
                if (geometryChanged) borders.setAttribute("transform", matrix(initialScale));
                lastMapProgress = progress;
                mask.hidden = progress >= 1;
                [fill, borders, ...edgeFades].forEach(element => { element.style.opacity = String(1 - progress); });
            } catch {
                disableMap();
            }
        };
        function remeasure() {
            if (disposed) return;
            geometry = undefined;
            try { sync(); } catch { cleanup(); }
        }
        try {
            story = setupCoffeeProcessSlideshow(root);
            root.setAttribute("data-origin-enhanced", "");
            viewport.removeAttribute("viewBox");
            stop = observeScroll(sync, cleanup);
            window.addEventListener("resize", remeasure);
            window.addEventListener("pageshow", remeasure);
            reducedMotion.addEventListener("change", remeasure);
            if (typeof ResizeObserver !== "undefined") {
                resizeObserver = new ResizeObserver(remeasure);
                resizeObserver.observe(stage);
                resizeObserver.observe(root);
            }
        } catch {
            cleanup();
        }
        // The decorative SVG can arrive later or fail without stopping the horizontal story.
        if (!disposed) {
            try {
                mapImage = new Image();
                mapImage.onload = () => {
                    if (disposed) return;
                    mapReady = true;
                    root.setAttribute("data-origin-map-ready", "");
                    remeasure();
                };
                mapImage.onerror = () => { if (!disposed) disableMap(); };
                mapImage.src = MAP_ASSET;
            } catch {
                disableMap();
            }
        }
        return cleanup;
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
