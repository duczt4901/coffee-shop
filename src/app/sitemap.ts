import type { MetadataRoute } from "next";
import { database } from "@/lib/database";
import { products } from "@/data/products";
import { blogCategoryPath, blogPostPath, getWordPressBlog } from "@/lib/wordpress-blog";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const blog = await getWordPressBlog();
    return [
        {
            url: database.site.url,
            changeFrequency: "monthly",
            priority: 1,
        },
        { url: new URL("/faq/", database.site.url).toString(), changeFrequency: "monthly", priority: 0.6 },
        ...["/ve-chung-toi/", "/cau-chuyen/", "/lien-he/", "/san-pham/", ...products.map(({ slug }) => `/san-pham/${slug}/`)].map((path) => ({ url: new URL(path, database.site.url).toString() })),
        ...(blog
            ? ["/bai-viet/", ...blog.posts.map(({ slug }) => blogPostPath(slug)), ...blog.categories.map(({ slug }) => blogCategoryPath(slug))].map((path) => ({
                  url: new URL(path, database.site.url).toString(),
              }))
            : []),
    ];
}
