import { z } from "zod";

const headerItemSchema = z.object({
    ariaLabel: z.string().min(1),
    href: z.string().min(1),
});

export const databaseSchema = z.object({
    site: z.object({
        name: z.string().min(1),
        shortName: z.string().min(1),
        url: z.url(),
        language: z.string().min(2),
        locale: z.string().min(2),
        title: z.string().min(1),
        description: z.string().min(1),
        keywords: z.array(z.string().min(1)),
        themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),

    header: z.object({
        ariaLabel: z.string().min(1),
        href: z.string().min(1),
        headerItems: z.array(headerItemSchema),
    }),

    footer: z.object({
        copyright: z.string().min(1),
    }),
});

export type Database = z.infer<typeof databaseSchema>;
export type HeaderItem = z.infer<typeof headerItemSchema>;
