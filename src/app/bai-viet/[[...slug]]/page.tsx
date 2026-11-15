import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { EditorialReveal } from "@/components/ui/EditorialReveal";
import { database } from "@/lib/database";
import { createMetadata } from "@/lib/metadata";
import { blogCategoryPath, blogPostPath, getWordPressBlog } from "@/lib/wordpress-blog";
import { sanitizeWordPressHtml, wordPressText } from "@/lib/wordpress-content";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug?: string[] }> };
export const dynamicParams = false;
export const dynamic = "force-static";

export async function generateStaticParams() {
    const blog = await getWordPressBlog();
    return [{ slug: [] }, ...(blog?.posts.map(({ slug }) => ({ slug: [slug] })) ?? []), ...(blog?.categories.map(({ slug }) => ({ slug: ["chuyen-muc", slug] })) ?? [])];
}

async function resolvePage(params: Props["params"]) {
    const blog = await getWordPressBlog();
    if (!blog) notFound();
    const { slug = [] } = await params;
    const post = slug.length === 1 ? blog.posts.find((post) => post.slug === slug[0]) : undefined;
    const category = slug.length === 2 && slug[0] === "chuyen-muc" ? blog.categories.find((term) => term.slug === slug[1]) : undefined;
    if (slug.length > 0 && !post && !category) notFound();
    return { ...blog, post, category };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { post, category } = await resolvePage(params);
    const title = post ? wordPressText(post.title.rendered) : category ? wordPressText(category.name) : "Bài viết";
    const description = post ? wordPressText(post.excerpt.rendered) : category ? wordPressText(category.description) : "Những bài viết từ Là Vườn Coffee.";
    const metadata = createMetadata({
        title: `${title} | ${database.site.name}`,
        description: description || database.site.description,
        path: post ? blogPostPath(post.slug) : category ? blogCategoryPath(category.slug) : "/bai-viet/",
    });
    if (post) metadata.openGraph = { ...metadata.openGraph, type: "article" };
    return metadata;
}

export default async function BlogPage({ params }: Props) {
    const { posts, categories, post, category } = await resolvePage(params);
    const title = post ? wordPressText(post.title.rendered) : category ? wordPressText(category.name) : "Bài viết";
    const visiblePosts = category ? posts.filter((post) => post.categories.includes(category.id)) : posts;

    return (
        <article className={styles.page}>
            {post && (
                <JsonLd
                    data={{
                        "@context": "https://schema.org",
                        "@type": "Article",
                        headline: title,
                        description: wordPressText(post.excerpt.rendered),
                        mainEntityOfPage: new URL(blogPostPath(post.slug), database.site.url).toString(),
                        publisher: { "@type": "Organization", name: database.site.name, url: database.site.url },
                    }}
                />
            )}
            <div className={styles.content}>
                <EditorialReveal>
                    <h1 data-reveal="words">{title}</h1>
                </EditorialReveal>
                {post ? (
                    <>
                        <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitizeWordPressHtml(post.content.rendered) }} />
                        <p className={styles.links}>
                            <Link href="/bai-viet/">Tất cả bài viết</Link>
                        </p>
                    </>
                ) : (
                    <>
                        <nav aria-label="Chuyên mục bài viết" className={styles.links}>
                            <Link href="/bai-viet/" aria-current={!category ? "page" : undefined}>
                                Tất cả
                            </Link>
                            {categories.map((term) => (
                                <Link key={term.id} href={blogCategoryPath(term.slug)} aria-current={category?.id === term.id ? "page" : undefined}>
                                    {wordPressText(term.name)}
                                </Link>
                            ))}
                        </nav>
                        {visiblePosts.length === 0 && <p>Chưa có bài viết.</p>}
                        {visiblePosts.map((item) => (
                            <section key={item.id} className={styles.entry}>
                                <h2>
                                    <Link href={blogPostPath(item.slug)}>{wordPressText(item.title.rendered)}</Link>
                                </h2>
                                <p>{wordPressText(item.excerpt.rendered)}</p>
                            </section>
                        ))}
                    </>
                )}
            </div>
        </article>
    );
}
