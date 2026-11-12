// Native resolution on 1× screens; bound large/retina buffers without stretching below CSS resolution.
export function getCoffeePixelRatio(width: number, height: number, devicePixelRatio: number) {
    const pixelBudget = 4_500_000;
    return Math.max(1, Math.min(devicePixelRatio || 1, 2, Math.sqrt(pixelBudget / (width * height))));
}
