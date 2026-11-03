"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";
import styles from "./EditorialReveal.module.css";
import { Button } from "./Button";
import { LinkMarker } from "./LinkMarker";

gsap.registerPlugin(SplitText, ScrollTrigger);

const REVEALS = {
    words: { from: { yPercent: 140 }, to: { yPercent: 0 }, duration: 1.2 },
    lines: { from: { yPercent: 140 }, to: { yPercent: 0 }, duration: 1 },
    block: { from: { autoAlpha: 0, y: 16 }, to: { autoAlpha: 1, y: 0 }, duration: 0.8 },
    border: { from: { scaleX: 0, transformOrigin: "left" }, to: { scaleX: 1 }, duration: 1.2 },
    marker: { from: { scale: 0, rotation: 20, transformOrigin: "left top" }, to: { scale: 1, rotation: 0 }, duration: 1 },
};

export function EditorialReveal({ children, start = "top 85%" }: { children: ReactNode; start?: string }) {
    const scopeRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const { started } = useExperienceRuntime();

    useGSAP(
        () => {
            const scope = scopeRef.current;
            const root = scope?.firstElementChild;
            if (!started || !scope || !root) return;

            const motion = gsap.matchMedia();
            motion.add("(prefers-reduced-motion: no-preference)", () => {
                let entered = false;
                const animations = new Map<Element, gsap.core.Timeline>();
                const splits: SplitText[] = [];
                const targets = Array.from(scope.querySelectorAll<HTMLElement>("[data-reveal]")).filter((target) => target.closest("[data-editorial-reveal]") === scope);

                targets.forEach((target, index) => {
                    const mode = target.dataset.reveal as keyof typeof REVEALS;
                    const preset = REVEALS[mode];
                    const at = Number(target.dataset.revealAt ?? index * 0.1) + (mode === "lines" ? 0.12 : 0);
                    const animate = (parts: gsap.TweenTarget, masks: Element[] = []) => {
                        const timeline = gsap.timeline({ paused: !entered });
                        timeline.fromTo(
                            parts,
                            preset.from,
                            {
                                ...preset.to,
                                duration: preset.duration,
                                stagger: 0.05,
                                ease: mode === "border" ? "power3.inOut" : "power3.out",
                            },
                            at,
                        );
                        // Masks belong to the reveal, not the finished text's ink bounds.
                        if (masks.length) timeline.set(masks, { overflow: "visible" });
                        animations.set(target, timeline);
                        return timeline;
                    };

                    if (mode === "words" || mode === "lines") {
                        splits.push(
                            SplitText.create(target, {
                                type: mode === "words" ? "lines,words" : "lines",
                                mask: "lines",
                                tag: "span",
                                linesClass: styles.line,
                                wordsClass: styles.word,
                                autoSplit: true,
                                onSplit: (split) => {
                                    split.lines.forEach((line) => line.setAttribute("data-reveal-line", ""));
                                    split.words.forEach((word) => word.setAttribute("data-reveal-word", ""));
                                    split.masks.forEach((mask) => {
                                        mask.classList.add(styles.mask);
                                        mask.setAttribute("data-reveal-mask", "");
                                    });
                                    return animate(mode === "words" ? split.words : split.lines, split.masks);
                                },
                            }),
                        );
                    } else {
                        animate(target);
                    }
                });

                // One trigger gives the group a shared start while its parts overlap in time.
                const reveal = () => {
                    entered = true;
                    animations.forEach((animation) => animation.play());
                };
                const trigger = ScrollTrigger.create({
                    trigger: root,
                    start: `clamp(${start})`,
                    once: true,
                    onEnter: reveal,
                    onRefresh: (self) => {
                        if (!entered && self.scroll() >= self.start) reveal();
                    },
                });
                ScrollTrigger.refresh(true);

                return () => {
                    trigger.kill();
                    splits.forEach((split) => split.revert());
                    animations.forEach((animation) => animation.kill());
                };
            });
            return () => motion.revert();
        },
        { scope: scopeRef, dependencies: [start, started, pathname], revertOnUpdate: true },
    );

    // An owned scope also accepts streamed Server Component children without cloning their refs.
    return (
        <div ref={scopeRef} className={styles.scope} data-editorial-reveal>
            {children}
        </div>
    );
}

export function RevealLink({
    href,
    children,
    variant = "button",
    className = "",
    delay = 0,
}: {
    href: string;
    children: ReactNode;
    variant?: "button" | "border";
    className?: string;
    delay?: number;
}) {
    const bordered = variant === "border";
    if (!bordered)
        return (
            <EditorialReveal>
                <Button href={href} className={className}>
                    <span data-reveal="words" data-reveal-at={delay} className={styles.label}>
                        {children}
                    </span>
                </Button>
            </EditorialReveal>
        );
    return (
        <EditorialReveal>
            <Link href={href} className={`${styles.borderLink} ${className}`}>
                {bordered && <span aria-hidden="true" data-reveal="border" data-reveal-at={delay} data-reveal-border className={styles.border} />}
                <span data-reveal="words" data-reveal-at={delay + (bordered ? 0.2 : 0)} className={styles.label}>
                    {children}
                </span>
                {bordered && (
                    <span aria-hidden="true" data-reveal="marker" data-reveal-at={delay} className={styles.marker}>
                        <LinkMarker />
                    </span>
                )}
            </Link>
        </EditorialReveal>
    );
}
