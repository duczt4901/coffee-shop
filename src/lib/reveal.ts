import type { CSSProperties } from "react";

// Shared by image CSS transitions and text Web Animations.
export const REVEAL = {
    duration: 1600,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    enter: 0.9,
    exit: 0.1,
    wordStagger: 40,
    textStagger: 180,
    bodyDelay: 120,
} as const;

export function getTextRevealDelay(target: HTMLElement, mode: string, focused = false) {
    const headings = "h1, h2, h3, h4, h5, h6, [role='heading'], [data-reveal-title]";
    if (focused || mode === "border" || mode === "marker" || target.closest(headings) || target.querySelector(`${headings}, img, video, canvas`)) return 0;
    return REVEAL.bodyDelay;
}

export const revealStyle = {
    "--reveal-duration": `${REVEAL.duration}ms`,
    "--reveal-easing": REVEAL.easing,
} as CSSProperties;

export function isRevealVisible(bounds: { top: number; height: number }, viewport: number, atPageEnd = false) {
    if (bounds.height <= 0) return false;
    const bottom = bounds.top + bounds.height;
    return (bounds.top < viewport * REVEAL.enter && bottom > viewport * REVEAL.exit) || (atPageEnd && bounds.top < viewport && bottom > 0);
}
