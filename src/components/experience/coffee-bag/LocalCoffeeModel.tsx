"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import type { createCoffeeModel } from "./coffee-model-runtime";
import styles from "../CoffeeBagExperience.module.css";
import "./coffee-framing.generated.css";

export type CoffeeModelHandle = { setProgress: (progress: number) => void };

export function LocalCoffeeModel({ ref }: { ref: Ref<CoffeeModelHandle> }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mountRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef(0.5);
    const modelRef = useRef<ReturnType<typeof createCoffeeModel> | undefined>(undefined);
    useImperativeHandle(ref, () => ({
        setProgress(progress) {
            progressRef.current = Math.max(0, Math.min(1, progress));
            modelRef.current?.setProgress(progressRef.current);
        },
    }), []);

    useEffect(() => {
        const mount = mountRef.current;
        const container = containerRef.current;
        if (!mount || !container) return;
        let disposed = false;
        let started = false;
        let observer: IntersectionObserver | undefined;
        const root = document.documentElement;
        const usePlaceholder = () => {
            if (disposed) return true;
            if (root.dataset.coffeeFallback !== "true") return false;
            observer?.disconnect();
            modelRef.current?.dispose();
            modelRef.current = undefined;
            container.dataset.coffeeState = "fallback";
            return true;
        };
        if (usePlaceholder()) return;
        const fallbackObserver = new MutationObserver(usePlaceholder);
        fallbackObserver.observe(root, { attributes: true, attributeFilter: ["data-coffee-fallback"] });
        const start = () => {
            if (disposed || started || usePlaceholder()) return;
            started = true;
            observer?.disconnect();
            // Keep Three.js parsing and WebGL out of the offscreen hero-loading path.
            void import("./coffee-model-runtime").then(({ createCoffeeModel }) => {
                if (disposed || usePlaceholder()) return;
                modelRef.current = createCoffeeModel(container, mount, progressRef.current);
            }).catch(error => {
                if (disposed || usePlaceholder()) return;
                container.dataset.coffeeState = "error";
                console.error("Coffee 3D is unavailable; keeping the scene image.", error);
            });
        };
        try {
            if (typeof IntersectionObserver === "undefined") start();
            else {
                observer = new IntersectionObserver(([entry]) => {
                    if (entry.intersectionRatio > 0) start();
                });
                observer.observe(mount);
            }
        } catch { start(); }
        return () => {
            disposed = true;
            observer?.disconnect();
            fallbackObserver.disconnect();
            modelRef.current?.dispose();
            modelRef.current = undefined;
        };
    }, []);

    return (
        <div ref={containerRef} data-coffee-canvas data-coffee-state="loading" className={styles.canvas} role="img" aria-label="Cà phê Robusta Lâm Đồng">
            <div ref={mountRef} data-coffee-frame className={styles.renderFrame}>
                <picture>
                    <source media="(max-width: 47.999rem)" srcSet="/images/3d/robusta-scene-poster-mobile.webp" />
                    <img data-coffee-fallback className={styles.modelFallback} src="/images/3d/robusta-scene-poster.webp" alt="" width={1280} height={1325} loading="lazy" decoding="async" />
                </picture>
            </div>
        </div>
    );
}
