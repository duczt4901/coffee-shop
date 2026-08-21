"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";

const ROWS = 4;
const MINIMUM_VISIBLE_MS = 1050;

gsap.registerPlugin(CustomEase);
CustomEase.create("hop", "0.9, 0, 0.1, 1");

declare global {
    interface Window {
        __sketchfabReady?: boolean;
    }
}

export function LandingReveal() {
    const rootRef = useRef<HTMLDivElement>(null);
    const blockRef = useRef<Array<HTMLDivElement | null>>([]);
    const spinnerRef = useRef<HTMLSpanElement>(null);
    const { start } = useExperienceRuntime();

    useLayoutEffect(() => {
        let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
        let revealTimer: ReturnType<typeof setTimeout> | undefined;
        const previousOverflow = document.documentElement.style.overflow;
        const mountedAt = performance.now();

        document.documentElement.style.overflow = "hidden";

        const ctx = gsap.context(() => {
            const blocks = blockRef.current.filter(
                (block): block is HTMLDivElement => block !== null
            );
            const backdrop = document.querySelector<HTMLElement>(".home-page-video");

            gsap.set(blocks, {
                scaleX: 1,
                transformOrigin: "right center",
            });

            // Timeline chưa chạy cho tới khi Sketchfab ready
            const tl = gsap.timeline({
                paused: true,

                onComplete: () => {
                    gsap.set(rootRef.current, {
                        display: "none",
                    });
                    document.documentElement.style.overflow = previousOverflow;
                },
            });

            tl.to(spinnerRef.current, {
                opacity: 0,
                duration: 0.2,
                ease: "power2.out",
            });

            tl.addLabel("experience-start");
            tl.call(start);

            tl.to(blocks, {
                scaleX: 0,
                duration: 0.8,
                stagger: 0.075,
                ease: "hop",
            }, "experience-start");

            if (backdrop) {
                tl.to(backdrop, {
                    scale: 1.1,
                    duration: 0.8,
                    ease: "power2.out",
                }, "experience-start+=0.3");
            }

            let revealed = false;

            const reveal = () => {
                if (revealed) return;

                revealed = true;

                if (fallbackTimer) {
                    clearTimeout(fallbackTimer);
                }

                const remaining = Math.max(
                    0,
                    MINIMUM_VISIBLE_MS - (performance.now() - mountedAt),
                );

                revealTimer = setTimeout(() => {
                    tl.play();
                }, remaining);
            };

            // Sketchfab có thể đã load xong trước khi LandingReveal mount
            if (window.__sketchfabReady) {
                reveal();
            } else {
                window.addEventListener(
                    "sketchfab:ready",
                    reveal,
                    { once: true }
                );

                // Không để loading overlay kẹt vĩnh viễn nếu Sketchfab lỗi
                fallbackTimer = setTimeout(() => {
                    reveal();
                }, 5000);
            }

            return () => {
                window.removeEventListener(
                    "sketchfab:ready",
                    reveal
                );

                if (fallbackTimer) {
                    clearTimeout(fallbackTimer);
                }

                if (revealTimer) {
                    clearTimeout(revealTimer);
                }

                document.documentElement.style.overflow = previousOverflow;
                tl.kill();
            };
        }, rootRef);

        return () => {
            ctx.revert();
        };
    }, [start]);

    return (
        <div
            ref={rootRef}
            className="fixed inset-0 z-10"
            role="status"
            aria-label="Đang tải trải nghiệm 3D"
        >
            <div className="absolute inset-0 flex flex-col">
                {Array.from({ length: ROWS }).map((_, index) => (
                    <div
                        key={index}
                        ref={(element) => {
                            blockRef.current[index] = element;
                        }}
                        className="relative flex flex-1 items-center justify-center bg-foreground"
                    >
                        {index === ROWS - 1 && (
                            <span
                                ref={spinnerRef}
                                aria-hidden="true"
                                className="h-8 w-8 animate-spin rounded-full border-2 border-background/30 border-t-background motion-reduce:animate-none"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
