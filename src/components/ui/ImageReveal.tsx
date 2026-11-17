"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { enhanceWhenVisible } from "@/lib/enhance-when-visible";
import styles from "./ImageReveal.module.css";
import { revealStyle } from "@/lib/reveal";

/** Fills an existing positioned image frame without changing its layout. */
export function ImageReveal({ children, parallax = 80 }: { children: ReactNode; parallax?: number }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const revealedRef = useRef(false);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        return enhanceWhenVisible(root, () => import("./image-reveal-runtime").then(module => element => module.setupImageReveal(element, parallax, revealedRef)));
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
            <div data-image-reveal-layer className={styles.layer}>
                {children}
            </div>
        </div>
    );
}
