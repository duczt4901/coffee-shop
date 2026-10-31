"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";
import styles from "./ImageReveal.module.css";

/** Fills an existing positioned image frame without changing its layout. */
export function ImageReveal({ children, parallax = 80 }: { children: ReactNode; parallax?: number }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const { started } = useExperienceRuntime();

    useGSAP(() => {
        const root = rootRef.current;
        const layer = layerRef.current;
        if (!started || !root || !layer) return;

        const motion = gsap.matchMedia();
        motion.add("(prefers-reduced-motion: no-preference)", () => {
            let frame = 0;
            root.classList.add(styles.animated);

            const update = () => {
                frame = 0;
                const { top, height } = root.getBoundingClientRect();
                if (!height) return;
                // Measure the visible frame so sticky images also follow their actual position.
                const progress = Math.max(0, Math.min(1, (window.innerHeight - top) / (window.innerHeight + height)));
                const range = Math.max(0, parallax);
                layer.style.transform = `translate3d(0, ${(progress - 0.5) * range}px, 0) scale(${1 + range / height})`;
            };
            const requestUpdate = () => {
                if (!frame) frame = requestAnimationFrame(update);
            };

            const reveal = new IntersectionObserver(([entry]) => {
                if (!entry.isIntersecting) return;
                root.classList.add(styles.revealed);
                reveal.disconnect();
            }, { rootMargin: "-10% 0px -10% 0px" });
            reveal.observe(root);

            const resize = new ResizeObserver(requestUpdate);
            resize.observe(root);
            window.addEventListener("scroll", requestUpdate, { passive: true });
            window.addEventListener("resize", requestUpdate);
            update();

            return () => {
                reveal.disconnect();
                resize.disconnect();
                window.removeEventListener("scroll", requestUpdate);
                window.removeEventListener("resize", requestUpdate);
                cancelAnimationFrame(frame);
                root.classList.remove(styles.animated, styles.revealed);
                layer.style.removeProperty("transform");
            };
        });

        return () => motion.revert();
    }, { scope: rootRef, dependencies: [started, parallax], revertOnUpdate: true });

    return (
        <div ref={rootRef} className={styles.root} data-image-reveal>
            <div ref={layerRef} className={styles.layer}>{children}</div>
        </div>
    );
}
