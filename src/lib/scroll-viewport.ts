/** Matches the stable CSS viewport used by scroll animations, including on mobile. */
export function getScrollViewportHeight(): number {
    return document.querySelector<HTMLElement>("[data-scroll-viewport]")!.clientHeight;
}
