import { z } from "zod";

const text = z.string().trim().min(1);

export const productSchema = z.object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: text,
    category: text,
    tagline: text,
    sizeLabel: text,
    priceVnd: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    image: z.string().regex(/^\/images\/products\/wp-\d+-[a-f0-9]{16}\.(?:webp|png|jpg)$/),
    accent: z.string().regex(/^#[a-f0-9]{6}$/i),
    origin: text,
    process: text,
    varieties: text,
    altitude: text,
    roast: text,
    story: text,
    available: z.boolean(),
    badge: text.optional(),
});

export type Product = z.infer<typeof productSchema>;
