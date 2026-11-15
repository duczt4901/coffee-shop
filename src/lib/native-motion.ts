/** Rebuild an effect when its breakpoint or motion preference changes. */
export function observeMotion(query: string, setup: () => () => void) {
    const media = window.matchMedia(query);
    let cleanup: (() => void) | undefined;
    const update = () => {
        cleanup?.();
        cleanup = undefined;
        cleanup = media.matches ? setup() : undefined;
    };
    media.addEventListener("change", update);
    try {
        update();
    } catch (error) {
        media.removeEventListener("change", update);
        throw error;
    }
    return () => {
        media.removeEventListener("change", update);
        cleanup?.();
    };
}

const scrollUpdates = new Set<() => void>();
let stopScroll: (() => void) | undefined;

/** Share one event-driven frame across scroll effects; do no work while idle. */
export function observeScroll(update: () => void, onError?: (error: unknown) => void) {
    const stop = () => {
        scrollUpdates.delete(sync);
        if (!scrollUpdates.size) stopScroll?.();
    };
    const sync = () => {
        try {
            update();
        } catch (error) {
            stop();
            try {
                if (onError) onError(error);
                else console.error("Scroll enhancement stopped after an error.", error);
            } catch (cleanupError) {
                console.error("Scroll enhancement cleanup failed.", cleanupError);
            }
        }
    };
    scrollUpdates.add(sync);
    if (!stopScroll) {
        let frame = 0;
        const requestUpdate = () => {
            if (!frame)
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    scrollUpdates.forEach((sync) => sync());
                });
        };
        const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(requestUpdate);
        resize?.observe(document.body);
        window.addEventListener("scroll", requestUpdate, { passive: true });
        window.addEventListener("resize", requestUpdate);
        window.addEventListener("pageshow", requestUpdate);
        document.fonts?.addEventListener?.("loadingdone", requestUpdate);
        stopScroll = () => {
            resize?.disconnect();
            window.removeEventListener("scroll", requestUpdate);
            window.removeEventListener("resize", requestUpdate);
            window.removeEventListener("pageshow", requestUpdate);
            document.fonts?.removeEventListener?.("loadingdone", requestUpdate);
            cancelAnimationFrame(frame);
            stopScroll = undefined;
        };
    }
    try {
        update();
    } catch (error) {
        stop();
        throw error;
    }
    return stop;
}
