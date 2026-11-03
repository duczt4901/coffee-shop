import { z } from "zod";
import { getProduct } from "../data/products";
import { getShipping, MAX_QUANTITY } from "./commerce";

export const orderSchema = z.object({
    checkoutId: z.string().uuid(),
    customer: z.object({
        name: z.string().trim().min(2).max(100),
        phone: z
            .string()
            .trim()
            .max(20)
            .transform((value) => value.replace(/[\s.-]/g, "").replace(/^\+84/, "0"))
            .pipe(z.string().regex(/^0[35789]\d{8}$/)),
        email: z.string().trim().max(254).email().or(z.literal("")),
        city: z.string().trim().min(2).max(100),
        ward: z.string().trim().min(2).max(100),
        address: z.string().trim().min(5).max(300),
    }),
    items: z
        .array(z.object({ slug: z.string().min(1).max(100), quantity: z.number().int().min(1).max(MAX_QUANTITY) }))
        .min(1)
        .max(20),
    notes: z.string().trim().max(1000).default(""),
    website: z.literal("").default(""),
});
export type OrderInput = z.infer<typeof orderSchema>;

export function priceOrder(items: OrderInput["items"], shippingFee?: string) {
    const seen = new Set<string>();
    const lines = items.map(({ slug, quantity }) => {
        const product = getProduct(slug);
        if (!product || seen.has(slug)) throw new Error("Sản phẩm không hợp lệ. Vui lòng cập nhật giỏ hàng.");
        seen.add(slug);
        return { slug, quantity, name: product.name, sizeLabel: product.sizeLabel, unitPrice: product.priceVnd, lineTotal: product.priceVnd * quantity };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const shipping = getShipping(subtotal, shippingFee);
    return { lines, subtotal, shippingFee: shipping, total: shipping === null ? null : subtotal + shipping };
}
