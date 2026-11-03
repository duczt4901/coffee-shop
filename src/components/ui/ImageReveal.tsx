"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";
import styles from "./ImageReveal.module.css";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";

/** Fills an existing positioned image frame without changing its layout. */
export function ImageReveal({ children, parallax = 80 }: { children: ReactNode; parallax?: number }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const revealedRef = useRef(false);
    const { started } = useExperienceRuntime();

    useGSAP(
        () => {
            const root = rootRef.current;
            const layer = layerRef.current;
            if (!started || !root || !layer) return;

            const motion = gsap.matchMedia();
            motion.add("(prefers-reduced-motion: no-preference)", () => {
                let frame = 0;
                if (!revealedRef.current) root.classList.add(styles.animated);
                const update = () => {
                    frame = 0;
                    const { top, height } = root.getBoundingClientRect();
                    if (!height) return;
                    const viewport = getScrollViewportHeight();
                    const inView = top < viewport + 100 && top + height > -100;
                    root.classList.toggle(styles.inView, inView);
                    // Measure the frame directly: its own clip-path must not gate its reveal.
                    if (!revealedRef.current && top < viewport * 0.9 && top + height > viewport * 0.1) {
                        revealedRef.current = true;
                        root.classList.add(styles.revealed);
                    }
                    if (!inView) {
                        layer.style.removeProperty("transform");
                        return;
                    }
                    const progress = Math.max(0, Math.min(1, (viewport - top) / (viewport + height)));
                    const range = Math.max(0, parallax);
                    layer.style.transform = `translate3d(0, ${(progress - 0.5) * range}px, 0) scale(${1 + range / height})`;
                };
                const requestUpdate = () => {
                    if (!frame) frame = requestAnimationFrame(update);
                };

                const resize = new ResizeObserver(requestUpdate);
                resize.observe(root);
                window.addEventListener("scroll", requestUpdate, { passive: true });
                window.addEventListener("resize", requestUpdate);
                update();

                return () => {
                    resize.disconnect();
                    window.removeEventListener("scroll", requestUpdate);
                    window.removeEventListener("resize", requestUpdate);
                    cancelAnimationFrame(frame);
                    root.classList.remove(styles.animated, styles.revealed, styles.inView);
                    layer.style.removeProperty("transform");
                };
            });

            return () => motion.revert();
        },
        { scope: rootRef, dependencies: [started, parallax], revertOnUpdate: true },
    );

    return (
        <div
            ref={rootRef}
            className={styles.root}
            data-image-reveal
            onTransitionEnd={(event) => {
                if (event.target === event.currentTarget && event.propertyName === "clip-path") {
                    event.currentTarget.classList.remove(styles.animated, styles.revealed);
                }
            }}
        >
            <div ref={layerRef} className={styles.layer}>
                {children}
            </div>
        </div>
    );
}
