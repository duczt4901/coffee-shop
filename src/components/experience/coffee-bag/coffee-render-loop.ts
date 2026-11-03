type FrameClock = Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame">;

/** Retain the latest invalidation while suspended; draw at most once per frame. */
export function createCoffeeRenderLoop(render: () => void, clock: FrameClock = window) {
    let active = false;
    let dirty = false;
    let disposed = false;
    let frame: number | null = null;

    const cancel = () => {
        if (frame !== null) clock.cancelAnimationFrame(frame);
        frame = null;
    };

    const schedule = () => {
        if (disposed || !active || !dirty || frame !== null) return;
        frame = clock.requestAnimationFrame(() => {
            frame = null;
            dirty = false;
            render();
        });
    };

    return {
        invalidate() {
            if (disposed) return;
            dirty = true;
            schedule();
        },
        setActive(value: boolean) {
            if (disposed || active === value) return;
            active = value;
            if (active) schedule();
            else cancel();
        },
        dispose() {
            disposed = true;
            cancel();
        },
    };
}
