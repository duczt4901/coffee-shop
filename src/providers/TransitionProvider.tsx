"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { TransitionRouter } from "next-transition-router";
import { ReactNode, useLayoutEffect, useRef } from "react";
import { SplitText } from "gsap/SplitText";
import styles from "./TransitionProvider.module.css";

const ROWS = 4;

gsap.registerPlugin(CustomEase, SplitText);
CustomEase.create("hop", "0.9, 0, 0.1, 1");

export default function TransitionProvider({ children }: { children: ReactNode }) {
    const overlayRef = useRef(null);
    const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    const wordsRef = useRef<Element[]>([]);
    const splitRef = useRef<SplitText | null>(null);

    const showTransitionHeading = (): void => {
        headingRef.current?.classList.remove("sr-only");
    };

    const hideTransitionHeading = (): void => {
        headingRef.current?.classList.add("sr-only");
    };

    useLayoutEffect(() => {
        if (!headingRef.current) return;

        splitRef.current = new SplitText(headingRef.current, {
            type: "words",
            wordsClass: styles.word,
            mask: "words",
        });

        wordsRef.current = splitRef.current.words;
        gsap.set(wordsRef.current, { y: "100%" });

        return () => {
            splitRef.current?.revert();
        };
    }, []);

    const animateIn = (onComplete: () => void): gsap.core.Timeline => {
        showTransitionHeading();
        const tl = gsap.timeline({ onComplete });

        tl.set(panelRefs.current, {
            transformOrigin: "left center",
            scaleX: 0,
        });

        tl.set(wordsRef.current, { y: "100%" });

        tl.to(panelRefs.current, {
            scaleX: 1,
            duration: 0.7,
            ease: "hop",
            stagger: 0.075,
        });

        tl.to(
            wordsRef.current,
            {
                y: 0,
                duration: 0.7,
                ease: "power4.out",
                stagger: 0.1,
            },
            "-=0.6",
        );

        return tl;
    };

    const animateOut = (onComplete: () => void): gsap.core.Timeline => {
        showTransitionHeading();
        const tl = gsap.timeline({
            onComplete: () => {
                hideTransitionHeading();
                onComplete();
            },
        });

        tl.set(panelRefs.current, {
            transformOrigin: "right center",
            scaleX: 1,
        });

        tl.addLabel("animate-out");

        tl.to(wordsRef.current, {
            y: "-100%",
            duration: 0.5,
            ease: "power4.out",
            stagger: 0.1,
        });

        tl.to(
            panelRefs.current,
            {
                scaleX: 0,
                duration: 0.5,
                ease: "hop",
                stagger: 0.075,
            },
            "animate-out",
        );

        return tl;
    };

    return (
        <TransitionRouter
            auto
            leave={(next) => {
                const tl = animateIn(next);
                return () => tl.kill();
            }}
            enter={(next) => {
                const tl = animateOut(next);
                return () => tl.kill();
            }}
        >
            <div ref={overlayRef} data-route-transition className={styles.overlay}>
                {Array.from({ length: ROWS }).map((_, i) => (
                    <div
                        key={i}
                        className={styles.panel}
                        ref={(element) => {
                            panelRefs.current[i] = element;
                        }}
                    />
                ))}
            </div>

            <div className={styles.headingOverlay}>
                <h1 ref={headingRef} className={`${styles.heading} sr-only`} aria-hidden="true">
                    TRUNG TOAN COFFEE SHOP
                </h1>
            </div>

            {children}
        </TransitionRouter>
    );
}
