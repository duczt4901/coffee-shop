"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { database } from "@/lib/database";
import styles from "./PageReveal.module.css";

export function PageReveal({ initial, onReady }: { initial: boolean; onReady: () => void }) {
    const [firstLoad] = useState(initial);
    const [phase, setPhase] = useState("waiting");
    const overlayRef = useRef<HTMLDivElement>(null);
    const curtainRef = useRef<HTMLDivElement>(null);
    const lenis = useLenis();
    const stoppedLenisRef = useRef<typeof lenis>(undefined);
    useEffect(() => {
        if (!lenis || overlayRef.current?.hidden || lenis.isStopped) return;
        lenis.stop();
        stoppedLenisRef.current = lenis;
        return () => {
            if (stoppedLenisRef.current === lenis) {
                stoppedLenisRef.current = undefined;
                lenis.start();
            }
        };
    }, [lenis]);

    useEffect(() => {
        const overlay = overlayRef.current;
        if (!overlay || overlay.hidden) return;

        let disposed = false;
        let finished = false;
        let frame = 0;
        let deadline: ReturnType<typeof setTimeout> | undefined;
        let mediaDeadline: ReturnType<typeof setTimeout> | undefined;
        let loadingDeadline: ReturnType<typeof setTimeout> | undefined;
        const animations: Animation[] = [];
        const root = document.documentElement;
        const previousOverflow = root.style.overflow;
        const content = Array.from(document.querySelectorAll<HTMLElement>("main, [data-site-header], [data-site-footer], [role='scrollbar']"));
        const previousInert = content.map(element => element.inert);
        let locked = false;
        const cancelAnimations = () => animations.forEach(animation => {
            void animation.finished.catch(() => {});
            animation.cancel();
        });
        const unlock = () => {
            if (locked) {
                locked = false;
                root.style.overflow = previousOverflow;
                content.forEach((element, index) => { element.inert = previousInert[index]; });
            }
            const stoppedLenis = stoppedLenisRef.current;
            if (stoppedLenis) {
                stoppedLenisRef.current = undefined;
                stoppedLenis.start();
            }
        };
        const finish = () => {
            if (disposed || finished) return;
            finished = true;
            clearTimeout(deadline);
            clearTimeout(mediaDeadline);
            clearTimeout(loadingDeadline);
            cancelAnimationFrame(frame);
            // Hide before cancelling fill animations so the cover cannot flash back.
            overlay.hidden = true;
            cancelAnimations();
            releaseInput();
            unlock();
            onReady();
            setPhase("done");
        };
        const open = () => {
            if (disposed || finished) return;
            setPhase("opening");
            onReady();
            try {
                const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                const home = !!document.querySelector("[data-hero]");
                if (home && !reduced && curtainRef.current) animations.push(curtainRef.current.animate([
                    { clipPath: "inset(0 0 0% 0)" },
                    { clipPath: "inset(0 0 100% 0)" },
                ], { duration: 900, easing: "cubic-bezier(0.76, 0, 0.24, 1)", fill: "both" }));
                else animations.push(overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
                    duration: reduced ? 100 : 600, easing: "cubic-bezier(0.3, 0, 0.3, 1)", fill: "both",
                }));
                const brand = overlay.querySelector<HTMLElement>("[data-reveal-brand]");
                const logo = document.querySelector<HTMLElement>("[data-page-reveal-logo]");
                const from = brand?.getBoundingClientRect();
                const to = logo?.getBoundingClientRect();
                const handoff = firstLoad && home && !reduced && brand && logo && from?.width && to?.width;
                if (handoff) {
                    const x = to.left + to.width / 2 - from.left - from.width / 2;
                    const y = to.top + to.height / 2 - from.top - from.height / 2;
                    animations.push(brand.animate([
                        { transform: "translate(-50%, -50%) scale(1)" },
                        { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${to.width / from.width})` },
                    ], { duration: 900, easing: "cubic-bezier(0.76, 0, 0.24, 1)", fill: "both" }));
                    animations.push(logo.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 900, fill: "both" }));
                } else if (brand && firstLoad && !reduced) animations.push(brand.animate([
                    { opacity: 1 }, { opacity: 0 },
                ], { duration: 450, easing: "ease-in", fill: "both" }));
                const header = document.querySelector<HTMLElement>("[data-site-header]");
                if (header && !reduced) animations.push(header.animate([
                    { opacity: 0, filter: "blur(4px)" },
                    { opacity: 1, filter: "blur(0px)" },
                ], { duration: 500, delay: home ? 300 : 100, easing: "ease-out", fill: "both" }));
                if (logo && !handoff && !reduced) animations.push(logo.animate([
                    { opacity: 0, translate: "0 1.5rem" },
                    { opacity: 1, translate: "0 0" },
                ], { duration: 800, delay: firstLoad ? 450 : 100, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }));
                const heading = document.querySelector<HTMLElement>("main h1");
                if (!home && heading && !reduced) animations.push(heading.animate([
                    { opacity: 0, transform: "translateY(1rem)", filter: "blur(4px)" },
                    { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" },
                ], { duration: 800, delay: 100, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }));
                void Promise.all(animations.map(animation => animation.finished)).then(finish, finish);
            } catch {
                finish();
            }
        };

        const blockScroll = (event: Event) => { event.preventDefault(); };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") finish();
            else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) event.preventDefault();
        };
        const releaseInput = () => {
            for (const event of ["wheel", "touchmove"]) window.removeEventListener(event, blockScroll);
            window.removeEventListener("keydown", onKeyDown);
        };

        try {
            locked = true;
            root.style.overflow = "hidden";
            content.forEach(element => { element.inert = true; });
            deadline = setTimeout(finish, 6000);
            for (const event of ["wheel", "touchmove"]) window.addEventListener(event, blockScroll, { passive: false });
            window.addEventListener("keydown", onKeyDown);
            // Only fonts and the first image/poster are essential; 3D and video playback can finish later.
            let ready: Promise<unknown> = Promise.resolve();
            if (firstLoad) {
                const main = document.querySelector("main");
                const video = main?.querySelector<HTMLVideoElement>("[data-hero-video]");
                const image = video?.poster ? new Image() : main?.querySelector<HTMLImageElement>("img");
                if (video?.poster && image) image.src = video.poster;
                const logo = overlay.querySelector<HTMLImageElement>("[data-loading-logo]");
                ready = Promise.allSettled([document.fonts?.ready, image?.decode?.(), logo?.decode?.()]);
            }
            const mediaReady = Promise.race([ready, new Promise(resolve => { mediaDeadline = setTimeout(resolve, 1200); })]);
            // Keep the loading state readable even when fonts and poster are already cached.
            const loadingReady = firstLoad ? new Promise(resolve => { loadingDeadline = setTimeout(resolve, 450); }) : Promise.resolve();
            void Promise.all([mediaReady, loadingReady]).then(() => {
                clearTimeout(mediaDeadline);
                if (disposed || finished) return;
                frame = requestAnimationFrame(() => { frame = requestAnimationFrame(open); });
            }, finish);
        } catch {
            finish();
        }
        return () => {
            disposed = true;
            clearTimeout(deadline);
            clearTimeout(mediaDeadline);
            clearTimeout(loadingDeadline);
            cancelAnimationFrame(frame);
            cancelAnimations();
            unlock();
            releaseInput();
        };
    }, [firstLoad, onReady]);

    return (
        <>
            <div ref={overlayRef} data-page-reveal data-reveal-state={phase} data-reveal-initial={firstLoad} hidden={phase === "done"} aria-hidden={phase !== "waiting"} className={styles.reveal}>
                <div ref={curtainRef} data-reveal-curtain className={styles.curtain} />
                <div data-reveal-brand hidden={!firstLoad} className={styles.brand}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Same local image as the real logo for a matching handoff. */}
                    <img data-loading-logo src="/images/brand/logo-placeholder.jpg" width={500} height={350} alt="" fetchPriority="high" />
                    <span role="status" className="sr-only">Đang mở {database.site.name}…</span>
                </div>
                <span aria-hidden="true" className={styles.spinner} />
            </div>
            <noscript><style>{"[data-page-reveal]{display:none!important}"}</style></noscript>
        </>
    );
}
