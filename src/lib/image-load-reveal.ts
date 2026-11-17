export function revealLoadedImage(image: HTMLImageElement) {
    if (!image.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const filter = getComputedStyle(image).filter;
    image.animate(
        [{ filter: `${filter === "none" ? "" : filter} blur(4px)` }, { filter }],
        { duration: 500, easing: "ease-out" },
    );
}
