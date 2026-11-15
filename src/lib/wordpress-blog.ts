import { cache } from "react";
import { isWordPressConfigured, wordpress } from "./wordpress";

export const getWordPressBlog = cache(async () => {
    if (!isWordPressConfigured()) return null;
    const first = await wordpress.getPosts({ perPage: 100 });
    const posts = [...first.items];
    for (let page = 2; page <= first.totalPages; page++) {
        posts.push(...(await wordpress.getPosts({ perPage: 100, page })).items);
    }
    const firstCategories = await wordpress.getCategories({ perPage: 100 });
    const categories = [...firstCategories.items];
    for (let page = 2; page <= firstCategories.totalPages; page++) {
        categories.push(...(await wordpress.getCategories({ perPage: 100, page })).items);
    }
    function exportSlug(slug: string) {
        const decoded = decodeURIComponent(slug);
        if (!decoded || decoded === "." || decoded === ".." || /[/\\?#\s%]/.test(decoded) || [...decoded].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
            throw new Error("WordPress returned a slug that cannot be exported safely");
        }
        return decoded;
    }
    return {
        posts: posts.filter((post) => (!post.status || post.status === "publish") && !post.content?.protected && !post.excerpt?.protected).map((post) => ({ ...post, slug: exportSlug(post.slug) })),
        categories: categories.map((term) => ({ ...term, slug: exportSlug(term.slug) })),
    };
});

export const blogPostPath = (slug: string) => `/bai-viet/${encodeURIComponent(slug)}/`;
export const blogCategoryPath = (slug: string) => `/bai-viet/chuyen-muc/${encodeURIComponent(slug)}/`;
