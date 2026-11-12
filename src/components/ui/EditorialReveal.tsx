"use client";

import { useLenis } from "lenis/react";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { observeMotion, observeScroll } from "@/lib/native-motion";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import { splitWords } from "@/lib/split-words";
import { getTextRevealDelay, isRevealVisible, REVEAL } from "@/lib/reveal";
import styles from "./EditorialReveal.module.css";
import { Button } from "./Button";
import { LinkMarker } from "./LinkMarker";

const CONTENT_FRAMES = [
    { opacity: 0, transform: "translateY(16px)" },
    { opacity: 1, transform: "translateY(0)" },
];
const REVEALS = {
    words: [{ transform: "translateY(160%)" }, { transform: "translateY(0)" }],
    lines: CONTENT_FRAMES,
    block: CONTENT_FRAMES,
    border: [
        { transform: "scaleX(0)", transformOrigin: "left" },
        { transform: "scaleX(1)", transformOrigin: "left" },
    ],
    marker: [
        { transform: "scale(0) rotate(20deg)", transformOrigin: "left top" },
        { transform: "scale(1) rotate(0)", transformOrigin: "left top" },
    ],
};

export function EditorialReveal({ children }: { children: ReactNode }) {
    const scopeRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    useLayoutEffect(() => {
        const scope = scopeRef.current;
        if (!scope || typeof scope.animate !== "function") return;

        return observeMotion("(prefers-reduced-motion: no-preference)", () => {
            const animations: Animation[] = [];
            const splits: ReturnType<typeof splitWords>[] = [];
            const targets = Array.from(scope.querySelectorAll<HTMLElement>("[data-reveal]")).filter((target) => target.closest("[data-editorial-reveal]") === scope && (target.dataset.reveal ?? "") in REVEALS);
            const pending = new Set(targets);
            let stop = () => {};
            const cleanup = () => {
                stop();
                scope.removeEventListener("focusin", revealFocused);
                animations.forEach((animation) => animation.cancel());
                splits.forEach((split) => split.revert());
                targets.forEach((target) => target.removeAttribute("data-reveal-pending"));
                pending.clear();
            };
            const fail = (error: unknown) => {
                cleanup();
                console.error("Text reveal failed; keeping its content visible.", error);
            };

            const reveal = (target: HTMLElement, focused = false, sequenceDelay = 0) => {
                if (!pending.delete(target)) return;
                const mode = target.dataset.reveal as keyof typeof REVEALS;
                let parts = [target];
                // Keep offscreen text intact; allocate word masks and animations only when needed.
                if (mode === "words") {
                    const split = splitWords(target, styles.word, styles.mask);
                    splits.push(split);
                    parts = split.words;
                }
                target.removeAttribute("data-reveal-pending");
                parts.forEach((part, wordIndex) => {
                    const animation = part.animate(REVEALS[mode], {
                        duration: REVEAL.duration,
                        delay: sequenceDelay + getTextRevealDelay(target, mode, focused) + wordIndex * REVEAL.wordStagger,
                        easing: REVEAL.easing,
                        fill: "both",
                    });
                    animation.onfinish = () => {
                        animation.cancel();
                        if (mode === "words") part.parentElement?.classList.add(styles.finished);
                    };
                    animations.push(animation);
                });
            };
            const sync = () => {
                const viewport = getScrollViewportHeight();
                const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
                let textIndex = 0;
                pending.forEach((target) => {
                    if (!isRevealVisible(target.getBoundingClientRect(), viewport, atPageEnd)) return;
                    const decoration = target.dataset.reveal === "border" || target.dataset.reveal === "marker";
                    reveal(target, false, decoration ? 0 : textIndex++ * REVEAL.textStagger);
                });
                if (!pending.size) stop();
            };
            const revealFocused = (event: FocusEvent) => {
                try {
                    pending.forEach((target) => {
                        if (event.target instanceof Node && (target.contains(event.target) || target.closest("a, button, summary")?.contains(event.target))) reveal(target, true);
                    });
                    if (!pending.size) stop();
                } catch (error) {
                    fail(error);
                }
            };
            try {
                targets.forEach((target) => target.setAttribute("data-reveal-pending", ""));
                stop = observeScroll(sync, fail);
                if (!pending.size) stop();
                scope.addEventListener("focusin", revealFocused);
            } catch (error) {
                fail(error);
            }
            return cleanup;
        });
    }, [pathname]);

    return (
        <div ref={scopeRef} className={styles.scope} data-editorial-reveal>
            {children}
        </div>
    );
}

export function RevealLine({ side = "top", thickness = 1, className = "" }: { side?: "top" | "bottom"; thickness?: number; className?: string }) {
    return (
        <EditorialReveal>
            <span aria-hidden="true" data-reveal="border" data-edge={side} className={`${styles.divider} ${className}`} style={{ height: thickness }} />
        </EditorialReveal>
    );
}

export function RevealLink({
    href,
    children,
    variant = "button",
    className = "",
}: {
    href: string;
    children: ReactNode;
    variant?: "button" | "border";
    className?: string;
}) {
    const router = useRouter();
    const lenis = useLenis();
    const navigateAnchor = (event: { preventDefault: () => void }) => {
        if (!href.startsWith("#") || href.length === 1) return;
        const target = document.getElementById(href.slice(1));
        if (!target) return;
        event.preventDefault();
        router.push(href, { scroll: false });
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (lenis) lenis.scrollTo(target, { immediate: reduced });
        else target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
    };
    const bordered = variant === "border";
    if (!bordered)
        return (
            <EditorialReveal>
                <Button href={href} className={className} onNavigate={navigateAnchor}>
                    <span data-reveal="words" className={styles.label}>
                        {children}
                    </span>
                </Button>
            </EditorialReveal>
        );
    return (
        <EditorialReveal>
            <Link href={href} className={`${styles.borderLink} ${className}`} onNavigate={navigateAnchor}>
                {bordered && <span aria-hidden="true" data-reveal="border" data-reveal-border className={styles.border} />}
                <span data-reveal="words" className={styles.label}>
                    {children}
                </span>
                {bordered && (
                    <span aria-hidden="true" data-reveal="marker" className={styles.marker}>
                        <LinkMarker />
                    </span>
                )}
            </Link>
        </EditorialReveal>
    );
}
