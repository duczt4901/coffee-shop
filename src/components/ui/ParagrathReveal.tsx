"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";

gsap.registerPlugin(SplitText, ScrollTrigger);

type CopyParagrathProps = {
    children: React.ReactNode;
    delay?: number;
    start?: string;
    resetStart?: string;
    outOnScroll?: boolean;
    outStart?: string;
};

type SplitTextInstance = ReturnType<typeof SplitText.create> & {
    words: HTMLElement[];
};

export default function CopyParagrath({
                                          children,
                                          delay = 0,
                                          start = "top 80%",
                                          resetStart = "top 100%",
                                          outOnScroll = false,
                                          outStart = "bottom top",
}: CopyParagrathProps): React.ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const splitRef = useRef<SplitTextInstance[]>([]);
    const { started } = useExperienceRuntime();

    useGSAP(
        () => {
            if (!started) return;

            const container = containerRef.current;
            if (!container) return;

            splitRef.current = [];

            const elements: Element[] = container.hasAttribute("data-copy-wrapper")
                ? Array.from(container.children)
                : [container];

            elements.forEach((element) => {
                const split = SplitText.create(element, {
                    type: "words",
                    wordsClass: "word++",
                }) as SplitTextInstance;

                splitRef.current.push(split);
            });

            const words = splitRef.current.flatMap((split) => split.words);
            let tween: gsap.core.Tween | null = null;

            const reset = () => {
                tween?.kill();

                gsap.set(words, {
                    opacity: 0,
                    scale: 0,
                    filter: "blur(4px)",
                });
            };

            const animateIn = () => {
                tween?.kill();

                tween = gsap.fromTo(
                    words,
                    {
                        opacity: 0,
                        scale: 0,
                        filter: "blur(4px)",
                    },
                    {
                        opacity: 1,
                        scale: 1,
                        filter: "blur(0px)",
                        stagger: {
                            each: 0.03,
                            from: "center",
                        },
                        duration: 0.5,
                        ease: "power2.out",
                        delay,
                        overwrite: true,
                    }
                );
            };

            const animateOut = () => {
                tween?.kill();

                tween = gsap.to(words, {
                    opacity: 0,
                    scale: 0,
                    filter: "blur(4px)",
                    stagger: {
                        each: 0.02,
                        from: "center",
                    },
                    duration: 0.4,
                    ease: "power2.in",
                    overwrite: true,
                });
            };

            reset();

            const inTrigger = ScrollTrigger.create({
                trigger: container,
                start,
                onEnter: animateIn,
            });

            const resetTrigger = ScrollTrigger.create({
                trigger: container,
                start: resetStart,
                onLeaveBack: reset,
            });

            const outTrigger = outOnScroll
                ? ScrollTrigger.create({
                    trigger: container,
                    start: outStart,
                    onEnter: animateOut,
                    onLeaveBack: animateIn,
                })
                : null;

            requestAnimationFrame(() => {
                if (ScrollTrigger.isInViewport(container)) {
                    animateIn();
                }
            });

            return () => {
                tween?.kill();
                inTrigger.kill();
                resetTrigger.kill();
                outTrigger?.kill();

                splitRef.current.forEach((split) => {
                    split.revert();
                });
            };
        },
        {
            scope: containerRef,
            dependencies: [delay, start, resetStart, outOnScroll, outStart, started],
        }
    );

    const childArray = React.Children.toArray(children);

    if (childArray.length === 1 && React.isValidElement(childArray[0])) {
        return React.cloneElement(
            childArray[0] as React.ReactElement<{ ref?: React.Ref<HTMLElement> }>,
            { ref: containerRef }
        );
    }

    return (
        <div ref={containerRef} data-copy-wrapper="true">
            {children}
        </div>
    );
}
