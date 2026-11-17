/** Keep server HTML intact; load an enhancement only near the current viewport. */
export function enhanceWhenVisible<T extends Element>(element: T, load: () => Promise<(element: T) => (() => void) | undefined>) {
    let disposed = false;
    let started = false;
    let near = false;
    let visible = false;
    let cleanup: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;
    const start = () => {
        if (disposed || started || !near) return;
        if (!visible && document.documentElement.dataset.initialReveal !== "done") return;
        started = true;
        observer?.disconnect();
        window.removeEventListener("lavuon:reveal-done", start);
        void load().then(setup => {
            if (!disposed) cleanup = setup(element);
        }).catch(error => console.error("Scroll enhancement unavailable; keeping its HTML visible.", error));
    };
    window.addEventListener("lavuon:reveal-done", start);
    if (typeof IntersectionObserver === "undefined") {
        near = visible = true;
        start();
    } else {
        observer = new IntersectionObserver(([entry]) => {
            near = entry.isIntersecting;
            visible = near && entry.boundingClientRect.top < window.innerHeight && entry.boundingClientRect.bottom > 0;
            start();
        }, { rootMargin: "200px 0px" });
        observer.observe(element);
    }
    return () => {
        disposed = true;
        observer?.disconnect();
        window.removeEventListener("lavuon:reveal-done", start);
        cleanup?.();
    };
}
