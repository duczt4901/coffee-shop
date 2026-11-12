"use client";

import { TransitionRouter } from "next-transition-router";
import { type ReactNode, useEffect, useRef } from "react";
import styles from "./TransitionProvider.module.css";

const WORDS = ["TRUNG", "TOAN", "COFFEE", "SHOP"];

export default function TransitionProvider({ children }: { children: ReactNode }) {
    const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const wordsRef = useRef<Array<HTMLSpanElement | null>>([]);
    const cancelActive = useRef<(() => void) | undefined>(undefined);

    useEffect(() => {
        return () => cancelActive.current?.();
    }, []);

    const transition = (entering: boolean, next: () => void) => {
        cancelActive.current?.();
        const animations: Animation[] = [];
        let cancelled = false;
        let advanced = false;
        const stopAnimations = () =>
            animations.forEach((animation) => {
                void animation.finished.catch(() => {});
                animation.cancel();
            });
        const cancel = () => {
            cancelled = true;
            stopAnimations();
        };
        cancelActive.current = cancel;
        const finish = () => {
            if (cancelled || advanced) return;
            advanced = true;
            next();
        };
        const reset = () => {
            headingRef.current?.classList.add("sr-only");
            panelRefs.current.forEach((panel) => {
                if (panel) panel.style.transform = "scaleX(0)";
            });
        };
        const fail = (error: unknown) => {
            if (cancelled) return;
            stopAnimations();
            reset();
            console.error("Route animation failed; continuing navigation.", error);
            finish();
        };
        try {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                reset();
                finish();
                return cancel;
            }
            headingRef.current?.classList.remove("sr-only");
            panelRefs.current.forEach((panel, index) => {
                if (!panel) return;
                panel.style.transformOrigin = entering ? "right center" : "left center";
                panel.style.transform = entering ? "scaleX(0)" : "scaleX(1)";
                animations.push(
                    panel.animate([{ transform: entering ? "scaleX(1)" : "scaleX(0)" }, { transform: entering ? "scaleX(0)" : "scaleX(1)" }], {
                        duration: entering ? 500 : 700,
                        delay: index * 75,
                        easing: "cubic-bezier(0.9, 0, 0.1, 1)",
                        fill: "both",
                    }),
                );
            });
            wordsRef.current.forEach((word, index) => {
                if (!word) return;
                animations.push(
                    word.animate([{ transform: entering ? "translateY(0)" : "translateY(100%)" }, { transform: entering ? "translateY(-100%)" : "translateY(0)" }], {
                        duration: entering ? 500 : 700,
                        delay: (entering ? 0 : 325) + index * 100,
                        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                        fill: "both",
                    }),
                );
            });
            void Promise.all(animations.map((animation) => animation.finished))
                .then(() => {
                    if (cancelled) return;
                    if (entering) headingRef.current?.classList.add("sr-only");
                    finish();
                })
                .catch(fail);
        } catch (error) {
            fail(error);
        }
        return cancel;
    };

    return (
        <TransitionRouter auto leave={(next) => transition(false, next)} enter={(next) => transition(true, next)}>
            <div data-route-transition className={styles.overlay}>
                {Array.from({ length: 4 }, (_, index) => (
                    <div
                        key={index}
                        className={styles.panel}
                        ref={(element) => {
                            panelRefs.current[index] = element;
                        }}
                    />
                ))}
            </div>
            <div className={styles.headingOverlay}>
                <h1 ref={headingRef} className={`${styles.heading} sr-only`} aria-hidden="true">
                    {WORDS.map((word, index) => (
                        <span key={word}>
                            <span className={styles.mask}>
                                <span
                                    className={styles.word}
                                    ref={(element) => {
                                        wordsRef.current[index] = element;
                                    }}
                                >
                                    {word}
                                </span>
                            </span>
                            {index < WORDS.length - 1 ? " " : ""}
                        </span>
                    ))}
                </h1>
            </div>
            {children}
        </TransitionRouter>
    );
}
