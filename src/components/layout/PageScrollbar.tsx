"use client";

import { useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useLenis } from "lenis/react";

export function PageScrollbar() {
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const dragOffset = useRef(0);
    const lenis = useLenis();

    useLayoutEffect(() => {
        const track = trackRef.current!;
        const thumb = thumbRef.current!;
        const sync = () => {
            const viewport = window.innerHeight;
            const height = document.documentElement.scrollHeight;
            const range = height - viewport;
            const thumbHeight = Math.min(viewport, Math.max(32, (viewport * viewport) / height));
            const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
            track.hidden = range <= 0;
            track.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
            thumb.style.height = `${thumbHeight}px`;
            thumb.style.transform = `translateY(${progress * (viewport - thumbHeight)}px)`;
        };
        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(document.body);
        window.addEventListener("scroll", sync, { passive: true });
        window.addEventListener("resize", sync);
        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", sync);
            window.removeEventListener("resize", sync);
        };
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
            className="page-scrollbar"
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
            <div ref={thumbRef} className="page-scrollbar__thumb" />
        </div>
    );
}
