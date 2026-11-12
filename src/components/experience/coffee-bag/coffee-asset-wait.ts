/** A late optional asset must be released, never applied after its fallback was chosen. */
export function waitForCoffeeAsset<T>(pending: Promise<T>, timeout: number, signal: AbortSignal, discard: (asset: T) => void): Promise<T | null> {
    return new Promise(resolve => {
        let settled = false;
        const finish = (asset: T | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            signal.removeEventListener("abort", abort);
            resolve(asset);
        };
        const abort = () => finish(null);
        const timer = setTimeout(abort, timeout);
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
        pending.then(asset => {
            if (settled) discard(asset);
            else finish(asset);
        }, () => finish(null));
    });
}
