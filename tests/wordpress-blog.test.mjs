import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { importTypeScript, typeScriptModuleURL } from "../scripts/lib/import-typescript.mjs";

const moduleURL = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
let fixtureId = 0;
async function loadBlog(fixture = {}) {
    const wordpressURL = moduleURL(`
        // fixture ${++fixtureId}
        const fixture = ${JSON.stringify({ configured: true, posts: [[]], categories: [[]], ...fixture })};
        export const calls = [];
        export const isWordPressConfigured = () => fixture.configured;
        async function page(kind, options) {
            calls.push({ kind, ...options });
            if (fixture.error === kind) throw new Error('CMS unavailable');
            const pages = fixture[kind];
            return { items: pages[(options.page ?? 1) - 1], totalPages: pages.length, total: pages.flat().length };
        }
        export const wordpress = {
            getPosts: (options) => page('posts', options),
            getCategories: (options) => page('categories', options),
        };
    `);
    const blog = await importTypeScript(new URL("../src/lib/wordpress-blog.ts", import.meta.url), {
        react: moduleURL("export const cache = (fn) => fn;"),
        "./wordpress": wordpressURL,
    });
    return { ...blog, calls: (await import(wordpressURL)).calls };
}

const content = await importTypeScript(new URL("../src/lib/wordpress-content.ts", import.meta.url), {
    "sanitize-html": import.meta.resolve("sanitize-html"),
});

test("unconfigured CMS does not fetch content or turn failures into empty content", async () => {
    const disabled = await loadBlog({ configured: false });
    assert.equal(await disabled.getWordPressBlog(), null);
    assert.deepEqual(disabled.calls, []);
    for (const error of ["posts", "categories"]) {
        const blog = await loadBlog({ error });
        await assert.rejects(blog.getWordPressBlog(), /CMS unavailable/);
    }
});

test("blog loads all post and category pages once and exports Vietnamese slugs", async () => {
    const blog = await loadBlog({
        posts: [[{ id: 1, slug: "c%C3%A0-ph%C3%AA" }], [{ id: 2, slug: "thu-hoach" }]],
        categories: [[{ id: 3, slug: "%C4%91%E1%BB%9Di-s%E1%BB%91ng" }], [{ id: 4, slug: "vuon" }]],
    });
    const result = await blog.getWordPressBlog();
    assert.deepEqual(
        result.posts.map(({ slug }) => slug),
        ["cà-phê", "thu-hoach"],
    );
    assert.deepEqual(
        result.categories.map(({ slug }) => slug),
        ["đời-sống", "vuon"],
    );
    assert.deepEqual(blog.calls, [
        { kind: "posts", perPage: 100 },
        { kind: "posts", perPage: 100, page: 2 },
        { kind: "categories", perPage: 100 },
        { kind: "categories", perPage: 100, page: 2 },
    ]);
    assert.equal(blog.blogPostPath(result.posts[0].slug), "/bai-viet/c%C3%A0-ph%C3%AA/");
    assert.equal(blog.blogCategoryPath(result.categories[0].slug), "/bai-viet/chuyen-muc/%C4%91%E1%BB%9Di-s%E1%BB%91ng/");
});

test("unexportable CMS slugs fail the build rather than generating ambiguous paths", async () => {
    for (const slug of ["", ".", "..", "%2Fadmin", "%5Cadmin", "a%3Fb", "a%23b", "a%20b", "%252F", "%00", "%01", "%7F", "%broken"]) {
        const blog = await loadBlog({ posts: [[{ id: 1, slug }]] });
        await assert.rejects(blog.getWordPressBlog(), undefined, `Unsafe slug ${JSON.stringify(slug)} must fail`);
    }
    const category = await loadBlog({ categories: [[{ id: 1, slug: "%2Fadmin" }]] });
    await assert.rejects(category.getWordPressBlog());
});

test("private and password-protected content never enters exported blog data", async () => {
    const blog = await loadBlog({
        posts: [
            [
                { id: 1, slug: "public", status: "publish", content: { protected: false } },
                { id: 2, slug: "private", status: "private" },
                { id: 3, slug: "protected", content: { protected: true } },
                { id: 4, slug: "protected-excerpt", excerpt: { protected: true } },
            ],
        ],
    });
    assert.deepEqual(
        (await blog.getWordPressBlog()).posts.map(({ id }) => id),
        [1],
    );
});

test("CMS HTML removes executable content and unsafe URLs while preserving article markup", () => {
    const html = content.sanitizeWordPressHtml(
        '<h2>Vườn</h2><p onclick="alert(1)">Cà phê <strong>ngon</strong></p><script>alert(1)</script><iframe src="https://evil.example"></iframe><a href="javascript:alert(1)">x</a><a href="//evil.example">y</a><img src="data:image/svg+xml,evil" onerror="alert(1)"><img src="https://cms.example/coffee.jpg" alt="Cà phê" width="600"><a href="/bai-viet/">Bài viết</a>',
    );
    assert(html.includes("<h2>Vườn</h2>"));
    assert(html.includes("<strong>ngon</strong>"));
    assert(html.includes('src="https://cms.example/coffee.jpg"'));
    assert(html.includes('alt="Cà phê"'));
    assert(html.includes('href="/bai-viet/"'));
    assert.doesNotMatch(html, /script|iframe|onclick|onerror|javascript:|data:|evil\.example|alert\(/);
});

test("CMS plain text decodes entities once, separates paragraphs and removes scripts", () => {
    assert.equal(content.wordPressText("<p>Cà&nbsp;phê &amp; vườn &#x1F331;</p><p>&quot;Ngọt&quot;<br>mỗi ngày</p><script>evil()</script>"), 'Cà phê & vườn 🌱 "Ngọt" mỗi ngày');
    assert.equal(content.wordPressText("&amp;lt;script&amp;gt;"), "&lt;script&gt;");
});

test("blog metadata and sitemap use the public canonical domain and escaped paths", async () => {
    const database = JSON.parse(readFileSync(new URL("../src/data/db.json", import.meta.url), "utf8"));
    const databaseURL = moduleURL(`export const database = ${JSON.stringify(database)};`);
    const { createMetadata } = await importTypeScript(new URL("../src/lib/metadata.ts", import.meta.url), { "@/lib/database": databaseURL });
    const blog = await loadBlog();
    const path = blog.blogPostPath("cà-phê");
    const metadata = createMetadata({ title: "Cà phê", path });
    assert.equal(metadata.alternates.canonical, `https://lavuon.cafe${path}`);
    assert.equal(metadata.openGraph.url, metadata.alternates.canonical);

    const { default: sitemap } = await importTypeScript(new URL("../src/app/sitemap.ts", import.meta.url), {
        "@/lib/database": databaseURL,
        "@/data/products": typeScriptModuleURL(new URL("../src/data/products.ts", import.meta.url)),
        "@/lib/wordpress-blog": moduleURL(`
            export const getWordPressBlog = async () => ({ posts: [{ slug: 'cà-phê' }], categories: [{ slug: 'vuon' }] });
            export const blogPostPath = ${blog.blogPostPath.toString()};
            export const blogCategoryPath = ${blog.blogCategoryPath.toString()};
        `),
    });
    const urls = (await sitemap()).map(({ url }) => url);
    assert(urls.includes(`https://lavuon.cafe${path}`));
    assert(urls.includes("https://lavuon.cafe/bai-viet/chuyen-muc/vuon/"));
    assert(urls.every((url) => new URL(url).origin === "https://lavuon.cafe"));
    assert(urls.every((url) => !/gio-hang|thanh-toan/.test(url)));
});
