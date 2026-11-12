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
    const backdropRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (CSS.supports("animation-timeline", "scroll(root block)")) return;
        const hero = heroRef.current;
        const layer = backdropRef.current;
        if (!hero || !layer) return;
        return observeMotion("(min-width: 48rem) and (min-height: 38rem)", () => {
            const stop = observeScroll(() => {
                const distance = Math.max(0, Math.min(getScrollViewportHeight(), -hero.getBoundingClientRect().top));
                layer.style.transform = `translate3d(0, ${distance * 0.16}px, 0)`;
            });
            return () => {
                stop();
                layer.style.removeProperty("transform");
            };
        });
    }, []);

    return (
        <div className="relative isolate">
            <section ref={heroRef} data-hero className="relative min-h-screen min-h-svh overflow-hidden">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-neutral-950">
                    <div ref={backdropRef} className={`${styles.backdropParallax} absolute inset-x-0 -inset-y-[16svh] ${className}`}>
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

                <div className="relative z-10 min-h-screen min-h-svh">{heroContent}</div>
            </section>

            <div className="relative z-20 bg-background">{children}</div>
        </div>
    );
}
