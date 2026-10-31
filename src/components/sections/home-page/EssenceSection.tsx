"use client";

import React, { useId, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CoffeeStoryHorizontal } from "./CoffeeStoryHorizontal";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";

gsap.registerPlugin(ScrollTrigger);

// This point has an 83-unit clear radius inside the unchanged Lâm Đồng outline.
const MAP_ANCHOR = { x: 770, y: 755, radius: 83 };

export function EssenceSection(): React.ReactElement {
    const sectionRef = useRef<HTMLElement>(null);
    const maskId = useId();
    const shapeId = `${maskId}-shape`;
    const { started } = useExperienceRuntime();

    useGSAP(
        () => {
            if (!started) return;
            const root = sectionRef.current;
            if (!root) return;

            const copy = root.querySelector<HTMLElement>(".lam-dong-zoom__copy");
            const location = root.querySelector<HTMLElement>(".lam-dong-zoom__location");
            const viewport = root.querySelector<SVGSVGElement>(".lam-dong-zoom__map");
            const shape = root.querySelector<SVGGElement>(".lam-dong-zoom__shape");
            const borders = root.querySelector<SVGGElement>(".lam-dong-zoom__borders");
            const fill = root.querySelector<SVGUseElement>(".lam-dong-zoom__fill");
            const edgeFades = root.querySelectorAll<HTMLElement>(".lam-dong-zoom__edge-fade");
            const storyStart = root.querySelector<HTMLElement>(".lam-dong-zoom__story-start");
            if (!copy || !location || !viewport || !shape || !borders || !fill || !storyStart) return;

            const motion = gsap.matchMedia();
            motion.add({ compact: "(max-width: 63.999rem)", motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
                if (!context.conditions?.motion) return;
                const compact = context.conditions.compact;
                const introLength = compact ? 1.8 : 1.6;
                const hold = introLength * (compact ? 0.32 / 1.32 : 0.15 / 1.15);
                const metrics = { start: "", end: "" };

                const measure = () => {
                    const width = viewport.clientWidth;
                    const height = viewport.clientHeight;
                    const centerX = width * 0.5;
                    const centerY = height * 0.61;
                    const initialScale = compact ? Math.min((width * 0.55) / 290, (height * 0.34) / 370) : Math.min(width / 2400, height / 1200) * 0.828 * 1.12;
                    // The enclosing circle covers every corner, including through the outline's concave edges.
                    const finalScale = (Math.hypot(width * 0.5, Math.max(centerY, height - centerY)) / MAP_ANCHOR.radius) * 1.02;
                    const matrix = (scale: number) => `matrix(${scale},0,0,${scale},${centerX - MAP_ANCHOR.x * scale},${centerY - MAP_ANCHOR.y * scale})`;
                    metrics.start = matrix(initialScale);
                    metrics.end = matrix(finalScale);
                };
                measure();

                gsap.set(copy, { autoAlpha: 1 });
                gsap.set(location, { autoAlpha: 1 });
                gsap.set(fill, { opacity: 1 });
                gsap.set(edgeFades, { autoAlpha: 1 });

                const timeline = gsap.timeline({
                    defaults: { ease: "none" },
                    scrollTrigger: {
                        trigger: root,
                        start: "top top",
                        end: () => `+=${storyStart.offsetTop}px`,
                        scrub: true,
                        invalidateOnRefresh: true,
                        onRefreshInit: measure,
                    },
                });

                timeline
                    .fromTo(
                        [shape, borders],
                        { attr: { transform: () => metrics.start } },
                        {
                            attr: { transform: () => metrics.end },
                            duration: introLength - hold,
                        },
                        hold,
                    )
                    .to(copy, { autoAlpha: 0, duration: 0.3 }, hold)
                    .to(edgeFades, { autoAlpha: 0, duration: 0.3 }, hold)
                    .to(fill, { opacity: 0, duration: 0.38 }, hold)
                    .to(location, { autoAlpha: 0, duration: 0.12 }, hold + 0.38 + 0.5);
            });

            return () => motion.revert();
        },
        { scope: sectionRef, dependencies: [started] },
    );

    return (
        <section ref={sectionRef} className="lam-dong-zoom font-cormorant">
            <div className="lam-dong-zoom__story-start" aria-hidden="true" />

            <div className="lam-dong-zoom__sticky">
                <CoffeeStoryHorizontal />

                <div className="lam-dong-zoom__knockout-viewport" aria-hidden="true">
                    <div className="lam-dong-zoom__edge-fade lam-dong-zoom__edge-fade--top" />
                    <svg className="lam-dong-zoom__map" width="100%" height="100%">
                        <defs>
                            <g id={shapeId} className="lam-dong-zoom__shape">
                                <use href="/images/south-vietnam-knockout.svg#lam-dong" />
                            </g>
                            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" style={{ maskType: "luminance" }}>
                                <rect width="100%" height="100%" fill="white" />
                                <use href={`#${shapeId}`} fill="black" />
                            </mask>
                        </defs>
                        <rect width="100%" height="100%" fill="var(--background)" mask={`url(#${maskId})`} />
                        <g className="lam-dong-zoom__borders">
                            <use href="/images/south-vietnam-knockout.svg#province-context" />
                        </g>
                        <use className="lam-dong-zoom__fill" href={`#${shapeId}`} />
                    </svg>
                    <div className="lam-dong-zoom__edge-fade lam-dong-zoom__edge-fade--bottom" />
                </div>

                <p className="lam-dong-zoom__location">Lâm Đồng</p>

                <div className="lam-dong-zoom__copy">
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
