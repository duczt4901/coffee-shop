"use client";

import { getSmoothScroll } from "@/lib/smooth-scroll";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { enhanceWhenVisible } from "@/lib/enhance-when-visible";
import styles from "./EditorialReveal.module.css";
import { Button } from "./Button";
import { LinkMarker } from "./LinkMarker";

export function EditorialReveal({ children, step }: { children: ReactNode; step?: number }) {
    const scopeRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    useLayoutEffect(() => {
        const scope = scopeRef.current;
        if (!scope) return;
        // display:contents has no intersection box; observe its first rendered child.
        const anchor = scope.parentElement?.matches("main") ? scope.parentElement : scope.firstElementChild;
        if (!anchor) return;
        return enhanceWhenVisible(anchor, () => import("./editorial-reveal-runtime").then(module => () => module.setupEditorialReveal(scope)));
    }, [pathname]);

    return (
        <div ref={scopeRef} className={styles.scope} data-editorial-reveal data-reveal-step={step}>
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
    step,
}: {
    href: string;
    children: ReactNode;
    variant?: "button" | "border";
    className?: string;
    step?: number;
}) {
    const router = useRouter();
    const navigateAnchor = (event: { preventDefault: () => void }) => {
        if (!href.startsWith("#") || href.length === 1) return;
        const target = document.getElementById(href.slice(1));
        if (!target) return;
        event.preventDefault();
        router.push(href, { scroll: false });
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const lenis = getSmoothScroll();
        if (lenis) lenis.scrollTo(target, { immediate: reduced });
        else target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
    };
    const bordered = variant === "border";
    if (!bordered)
        return (
            <EditorialReveal step={step}>
                <Button href={href} className={className} onNavigate={navigateAnchor}>
                    <span data-reveal="words" className={styles.label}>
                        {children}
                    </span>
                </Button>
            </EditorialReveal>
        );
    return (
        <EditorialReveal step={step}>
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
