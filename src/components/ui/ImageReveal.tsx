"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { observeMotion, observeScroll } from "@/lib/native-motion";
import styles from "./ImageReveal.module.css";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import { isRevealVisible, revealStyle } from "@/lib/reveal";

/** Fills an existing positioned image frame without changing its layout. */
export function ImageReveal({ children, parallax = 80 }: { children: ReactNode; parallax?: number }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const revealedRef = useRef(false);

    useLayoutEffect(() => {
        const root = rootRef.current;
        const layer = layerRef.current;
        if (!root || !layer) return;

        let revealEnabled = false;
        const update = () => {
            const { top, height } = root.getBoundingClientRect();
            if (!height) return;
            const viewport = getScrollViewportHeight();
            const inView = top < viewport + 100 && top + height > -100;
            root.classList.toggle(styles.inView, inView);
            // Measure the frame directly: its own clip-path must not gate its reveal.
            const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
            if (revealEnabled && !revealedRef.current && isRevealVisible({ top, height }, viewport, atPageEnd)) {
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
        const stop = observeScroll(update);
        const stopReveal = observeMotion("(prefers-reduced-motion: no-preference)", () => {
            revealEnabled = true;
            if (!revealedRef.current) root.classList.add(styles.animated);
            update();
            return () => {
                revealEnabled = false;
                root.classList.remove(styles.animated, styles.revealed);
            };
        });

        return () => {
            stopReveal();
            stop();
            root.classList.remove(styles.inView);
            layer.style.removeProperty("transform");
        };
    }, [parallax]);

    return (
        <div
            ref={rootRef}
            className={styles.root}
            style={revealStyle}
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
