"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { observeMotion, observeScroll } from "@/lib/native-motion";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import styles from "./ImmersivePage.module.css";

type ImmersivePageProps = {
    backdrop: ReactNode;
    heroContent?: ReactNode;
    children: ReactNode;
    overlay?: boolean;
    className?: string;
};

export function ImmersivePage({ backdrop, heroContent, children, overlay = true, className = "" }: ImmersivePageProps): React.ReactElement {
    const heroRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        const hero = heroRef.current;
        if (!hero) return;
        if (typeof CSS !== "undefined" && CSS.supports("(animation-timeline: view()) and (animation-range: entry) and (animation-range: exit-crossing 0% exit-crossing 100%)")) return;
        return observeMotion("(prefers-reduced-motion: no-preference)", () => {
            let previousDistance = -1;
            const stop = observeScroll(() => {
                const bounds = hero.getBoundingClientRect();
                const distance = Math.max(0, Math.min(bounds.height || getScrollViewportHeight(), -bounds.top));
                if (distance === previousDistance) return;
                previousDistance = distance;
                hero.style.setProperty("--hero-parallax", `${distance * 0.5}px`);
            });
            return () => {
                stop();
                hero.style.removeProperty("--hero-parallax");
            };
        });
    }, []);

    return (
        <div className="relative isolate">
            <section ref={heroRef} data-hero className={`${styles.hero} relative min-h-screen min-h-svh overflow-hidden`}>
                <div data-hero-media aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-neutral-950">
                    <div className={`${styles.backdropParallax} absolute inset-x-0 -inset-y-[16svh] ${className}`}>
                        {backdrop}
                    </div>

                    {overlay && (
                        <>
                            <div className="absolute inset-0 bg-black/20" />

                            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.16)_0%,transparent_38%,rgba(0,0,0,0.35)_100%)]" />

                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.28)_0%,transparent_48%)]" />
                        </>
                    )}
                </div>

                <div data-hero-content className="relative z-10 min-h-screen min-h-svh">{heroContent}</div>
            </section>

            <div className="relative z-20 bg-background">{children}</div>
        </div>
    );
}
