"use client";

import { useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./PageScrollbar.module.css";
import { useLenis } from "lenis/react";

export function PageScrollbar() {
    const lenis = useLenis();
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const dragOffset = useRef(0);

    useLayoutEffect(() => {
        const track = trackRef.current;
        const thumb = thumbRef.current;
        if (!track || !thumb || typeof ResizeObserver === "undefined") return;
        const root = document.documentElement;
        let observer: ResizeObserver | undefined;
        let range = 0;
        let travel = 0;
        const sync = () => {
            const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
            track.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
            thumb.style.transform = `translateY(${progress * travel}px)`;
        };
        const measure = () => {
            const viewport = window.innerHeight;
            const height = document.documentElement.scrollHeight;
            range = height - viewport;
            const thumbHeight = Math.min(viewport, Math.max(32, (viewport * viewport) / height));
            travel = viewport - thumbHeight;
            track.hidden = range <= 0;
            thumb.style.height = `${thumbHeight}px`;
            sync();
        };
        const cleanup = () => {
            observer?.disconnect();
            window.removeEventListener("scroll", sync);
            window.removeEventListener("resize", measure);
            root.removeAttribute("data-custom-scrollbar");
            track.hidden = true;
        };
        try {
            observer = new ResizeObserver(measure);
            observer.observe(document.body);
            window.addEventListener("scroll", sync, { passive: true });
            window.addEventListener("resize", measure);
            measure();
            // Only replace the browser's scrollbar after its enhancement is ready.
            root.setAttribute("data-custom-scrollbar", "");
        } catch {
            cleanup();
        }
        return cleanup;
    }, []);

    const scrollTo = (top: number) => {
        if (getComputedStyle(document.documentElement).overflowY === "hidden") return;
        if (lenis) lenis.scrollTo(top, { immediate: true });
        else window.scrollTo({ top, behavior: "instant" });
    };

    const moveThumb = (clientY: number) => {
        const track = trackRef.current!.getBoundingClientRect();
        const travel = track.height - thumbRef.current!.offsetHeight;
        if (travel <= 0) return;
        const progress = Math.min(1, Math.max(0, (clientY - track.top - dragOffset.current) / travel));
        scrollTo(progress * (document.documentElement.scrollHeight - window.innerHeight));
    };

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        const thumb = thumbRef.current!.getBoundingClientRect();
        dragOffset.current = event.target === thumbRef.current ? event.clientY - thumb.top : thumb.height / 2;
        moveThumb(event.clientY);
    };

    const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const targets: Record<string, number> = {
            ArrowDown: window.scrollY + 40,
            ArrowUp: window.scrollY - 40,
            PageDown: window.scrollY + window.innerHeight,
            PageUp: window.scrollY - window.innerHeight,
            Home: 0,
            End: document.documentElement.scrollHeight - window.innerHeight,
        };
        if (!(event.key in targets)) return;
        event.preventDefault();
        scrollTo(targets[event.key]);
    };

    return (
        <div
            ref={trackRef}
            hidden
            className={styles.track}
            role="scrollbar"
            aria-label="Cuộn trang"
            aria-controls="main-content"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerUp={releasePointer}
            onPointerCancel={releasePointer}
            onKeyDown={onKeyDown}
            onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) moveThumb(event.clientY);
            }}
        >
            <div ref={thumbRef} className={styles.thumb} />
        </div>
    );
}
