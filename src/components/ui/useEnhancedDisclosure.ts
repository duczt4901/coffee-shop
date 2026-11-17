"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

const milliseconds = (value: string) => parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);

export function useEnhancedDisclosure() {
    const detailsRef = useRef<HTMLDetailsElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [enhanced, setEnhanced] = useState(false);
    const [open, setLogicalOpen] = useState(false);
    const [nativeOpen, setNativeOpen] = useState(false);
    const desiredOpen = useRef(false);
    const logicalOpen = useRef(false);
    const frame = useRef(0);

    useLayoutEffect(() => {
        const initial = detailsRef.current?.open ?? false;
        desiredOpen.current = logicalOpen.current = initial;
        setLogicalOpen(initial);
        setNativeOpen(initial);
        setEnhanced(true);
        return () => cancelAnimationFrame(frame.current);
    }, []);

    const setOpen = useCallback((next: boolean) => {
        desiredOpen.current = next;
        cancelAnimationFrame(frame.current);
        if (next) {
            setNativeOpen(true);
            if (detailsRef.current?.open) {
                logicalOpen.current = true;
                setLogicalOpen(true);
            }
        } else {
            if (!logicalOpen.current) setNativeOpen(false);
            logicalOpen.current = false;
            setLogicalOpen(false);
        }
    }, []);

    const disable = useCallback(() => {
        cancelAnimationFrame(frame.current);
        desiredOpen.current = logicalOpen.current = false;
        setLogicalOpen(false);
        setNativeOpen(false);
        setEnhanced(false);
    }, []);

    useLayoutEffect(() => {
        const details = detailsRef.current;
        if (!enhanced || !details) return;
        const syncNative = () => {
            // Find-in-page can open details without activating its summary.
            if (details.open === nativeOpen) return;
            cancelAnimationFrame(frame.current);
            desiredOpen.current = logicalOpen.current = details.open;
            setLogicalOpen(details.open);
            setNativeOpen(details.open);
        };
        details.addEventListener("toggle", syncNative);
        return () => details.removeEventListener("toggle", syncNative);
    }, [enhanced, nativeOpen]);

    useLayoutEffect(() => {
        const panel = panelRef.current;
        if (!enhanced || !nativeOpen || open || !panel) return;
        if (desiredOpen.current) {
            let cancelled = false;
            // Let a newly opened native disclosure paint its collapsed state first.
            try {
                void panel.offsetHeight;
                frame.current = requestAnimationFrame(() => {
                    if (cancelled) return;
                    frame.current = requestAnimationFrame(() => {
                        if (cancelled) return;
                        logicalOpen.current = true;
                        setLogicalOpen(true);
                    });
                });
            } catch {
                queueMicrotask(() => {
                    if (!cancelled) disable();
                });
            }
            return () => {
                cancelled = true;
                cancelAnimationFrame(frame.current);
            };
        }

        let timer: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;
        const finish = () => {
            if (!cancelled && !desiredOpen.current) setNativeOpen(false);
        };
        let end: ((event: TransitionEvent) => void) | undefined;
        try {
            const style = getComputedStyle(panel);
            const durations = style.transitionDuration.split(",").map(milliseconds);
            const delays = style.transitionDelay.split(",").map(milliseconds);
            const transitions = style.transitionProperty.split(",").map((property, index) => ({
                property: property.trim(),
                time: durations[index % durations.length] + delays[index % delays.length],
            }));
            const duration = Math.max(0, ...transitions.map((transition) => transition.property === "none" ? 0 : transition.time));
            if (!Number.isFinite(duration) || duration === 0) {
                finish();
                return;
            }
            end = (event) => {
                if (event.target === panel && transitions.some((transition) => transition.time === duration && (transition.property === event.propertyName || transition.property === "all"))) finish();
            };
            panel.addEventListener("transitionend", end);
            timer = setTimeout(finish, duration);
        } catch {
            finish();
        }
        return () => {
            cancelled = true;
            if (end) panel.removeEventListener("transitionend", end);
            clearTimeout(timer);
        };
    }, [enhanced, nativeOpen, open, disable]);

    return { detailsRef, panelRef, enhanced, open, nativeOpen, setOpen, disable };
}
