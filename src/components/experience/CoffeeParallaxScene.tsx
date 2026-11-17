"use client";

import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";
import layers from "@/data/coffee-parallax.json";
import framing from "./CoffeeBagExperience.module.css";
import styles from "./CoffeeParallaxScene.module.css";
import "./coffee-bag/coffee-framing.generated.css";

export type CoffeeParallaxHandle = { setProgress(progress: number): void };
// One scroll progress drives the whole flock; only these offsets differ.
const sceneLayers = [
    { id: "back", x: -40, y: 24, rotate: -5, photo: false },
    { id: "blue", x: -8, y: -5, rotate: -0.4, photo: true },
    { id: "orange", x: 10, y: 4, rotate: 0.35, photo: true },
    { id: "cup", x: -6, y: -7, rotate: 0.4, photo: true },
    { id: "green", x: 14, y: -3, rotate: -0.2, photo: true },
    { id: "middle", x: -28, y: 18, rotate: -3.5, photo: false },
    { id: "front", x: 100, y: -80, rotate: 16, photo: false },
] as const;

export function CoffeeParallaxScene({ ref }: { ref: Ref<CoffeeParallaxHandle> }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const loadedPhotos = useRef(new Set<string>());
    const motion = useRef({ progress: Number.NaN, active: false });
    const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
    const loaded = (id: string) => {
        loadedPhotos.current.add(id);
        if (loadedPhotos.current.size === 4) setStatus(current => current === "fallback" ? current : "ready");
    };

    useEffect(() => {
        rootRef.current?.querySelectorAll<HTMLImageElement>("[data-coffee-photo]").forEach(image => {
            if (image.complete && image.naturalWidth > 0) loaded(image.dataset.coffeeLayer!);
        });
    }, []);

    useImperativeHandle(ref, () => ({
        setProgress(value) {
            const root = rootRef.current;
            const progress = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));
            if (!root || motion.current.progress === progress) return;
            motion.current.progress = progress;
            root.style.setProperty("--coffee-parallax", String(progress - 0.5));
            const active = progress > 0 && progress < 1;
            if (active !== motion.current.active) {
                root.toggleAttribute("data-parallax-active", active);
                motion.current.active = active;
            }
        },
    }), []);

    const fallback = status === "fallback";
    const visibleLayers = fallback ? [{ id: "products", x: 0, y: 0, rotate: 0, photo: true }] as const : sceneLayers;
    const aspect = {
        "--frame-ratio": layers.desktop.products.frameWidth / layers.desktop.products.frameHeight,
        "--mobile-frame-ratio": layers.mobile.products.frameWidth / layers.mobile.products.frameHeight,
    } as CSSProperties;

    return (
        <div ref={rootRef} data-coffee-canvas data-coffee-state="2d" data-coffee-parallax data-parallax-ready={status === "ready"} data-parallax-fallback={fallback} className={`${framing.canvas} ${styles.scene}`} role="img" aria-label="Cà phê Robusta Lâm Đồng">
            <div data-coffee-frame className={styles.frame}>
                <div className={styles.artboard} style={aspect}>
                {visibleLayers.map(item => {
                    const desktop = layers.desktop[item.id], mobile = layers.mobile[item.id];
                    const placement = {
                        "--left": `${desktop.left}%`, "--top": `${desktop.top}%`, "--width": `${desktop.displayWidth}%`, "--height": `${desktop.displayHeight}%`,
                        "--mobile-left": `${mobile.left}%`, "--mobile-top": `${mobile.top}%`, "--mobile-width": `${mobile.displayWidth}%`, "--mobile-height": `${mobile.displayHeight}%`,
                        "--drift-x": item.x, "--drift-y": item.y, "--drift-rotate": item.rotate,
                    } as CSSProperties;
                    return <picture key={item.id} style={placement} className={`${styles.layer} ${item.photo ? "" : styles.decoration}`}>
                        <source media="(max-width: 47.999rem)" srcSet={mobile.src} />
                        <img
                            data-coffee-layer={item.id}
                            data-coffee-photo={item.photo || undefined}
                            src={desktop.src}
                            width={desktop.width}
                            height={desktop.height}
                            className={styles.image}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            onLoad={item.photo ? () => loaded(item.id) : undefined}
                            onError={event => {
                                if (item.photo && !fallback) setStatus("fallback");
                                else event.currentTarget.style.display = "none";
                            }}
                        />
                    </picture>;
                })}
                </div>
            </div>
        </div>
    );
}
