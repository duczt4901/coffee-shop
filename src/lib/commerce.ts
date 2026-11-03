import { getProduct } from "../data/products";

export type CartItem = { slug: string; quantity: number };
export const FREE_SHIPPING_THRESHOLD = 500000;
export const MAX_QUANTITY = 99;
export const formatPrice = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;

export function readCart(raw: string): CartItem[] {
    try {
        const value: unknown = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        const items = new Map<string, number>();
        for (const item of value) {
            if (!item || typeof item.slug !== "string" || !getProduct(item.slug) || !Number.isInteger(item.quantity) || item.quantity < 1) continue;
            items.set(item.slug, Math.min(MAX_QUANTITY, (items.get(item.slug) ?? 0) + item.quantity));
        }
        return [...items].map(([slug, quantity]) => ({ slug, quantity }));
    } catch {
        return [];
    }
}

export function getCartLines(items: CartItem[]) {
    return items.flatMap((item) => {
        const product = getProduct(item.slug);
        return product ? [{ ...item, product, lineTotal: product.priceVnd * item.quantity }] : [];
    });
}

export function getShipping(subtotal: number, configuredFee?: string): number | null {
    if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
    if (configuredFee === undefined || configuredFee.trim() === "") return null;
    const fee = Number(configuredFee);
    if (!Number.isSafeInteger(fee) || fee < 0 || fee > 1000000) throw new Error("SHIPPING_FEE_VND is invalid");
    return fee;
}
