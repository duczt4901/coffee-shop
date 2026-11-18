import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { generatePages, pageFields, pageImageFields } from "../scripts/generate-pages.mjs";
import { importTypeScript } from "../scripts/lib/import-typescript.mjs";

function fixture() {
    return Object.fromEntries(Object.values(pageFields).map(config => [config.id, {
        id: config.id, status: "publish",
        acf: Object.fromEntries(Object.entries(config.fields).map(([key, field]) => [key, field.default])),
        yoast_head_json: { title: `${config.title} | Là Vườn Coffee`, description: "Mô tả &amp; cà phê", canonical: "https://cms.example/", robots: { index: "noindex" } },
    }]));
}

test("page copy and Yoast change only on sync; invalid CMS data preserves the complete snapshot", async () => {
    const directory = await mkdtemp(join(tmpdir(), "coffee-pages-"));
    const root = pathToFileURL(`${directory}/`);
    const pages = fixture();
    const hits = [];
    const send = async url => {
        hits.push(String(url));
        return Response.json(pages[Number(new URL(url).pathname.split("/").pop())]);
    };
    const options = { root, baseUrl: "https://cms.example/wp-json/", fetch: send };
    try {
        pages[pageFields.products.id].acf.products_h1_1 = '<script>UNSAFE()</script>Hương vị &amp; Vườn';
        await generatePages(options);
        const file = new URL("src/data/page-content.ts", root);
        const first = await readFile(file, "utf8");
        assert.match(first, /Hương vị & Vườn/);
        assert.doesNotMatch(first, /UNSAFE|cms\.example|noindex/);
        assert.equal(hits.length, 6);
        pages[pageFields.products.id].acf.products_h1_1 = "Nội dung mới";
        assert.equal(await readFile(file, "utf8"), first);
        await generatePages(options);
        assert.match(await readFile(file, "utf8"), /Nội dung mới/);
        const valid = await readFile(file, "utf8");
        delete pages[pageFields.faq.id].acf.faq_h1_1;
        await assert.rejects(generatePages(options), /Missing or invalid field/);
        assert.equal(await readFile(file, "utf8"), valid);
        pages[pageFields.faq.id].acf.faq_h1_1 = ""; // Intentional empty copy is supported.
        pages[pageFields.contact.id].acf.contact_email_1 = "bad-email";
        await assert.rejects(generatePages(options), /Invalid contact email/);
        assert.equal(await readFile(file, "utf8"), valid);
        pages[pageFields.contact.id].acf.contact_email_1 = "contact@example.com";
        delete pages[pageFields.faq.id].yoast_head_json;
        await assert.rejects(generatePages(options), /schema/);
        assert.equal(await readFile(file, "utf8"), valid);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test("metadata uses page Yoast text with the public frontend canonical", async () => {
    const { createMetadata } = await importTypeScript(new URL("../src/lib/metadata.ts", import.meta.url), {
        "@/lib/database": `data:text/javascript,export const database=${encodeURIComponent(JSON.stringify({ site: { url: "https://lavuon.cafe", name: "Là Vườn Coffee", title: "Fallback", description: "Fallback", locale: "vi_VN", keywords: [] } }))}`,
        "@/data/page-content": `data:text/javascript,export const pageSeo=${encodeURIComponent(JSON.stringify({ "/san-pham/": { title: "Yoast title", description: "Yoast description", ogTitle: "Social title" } }))}`,
    });
    const metadata = createMetadata({ path: "/san-pham/", title: "Old title" });
    assert.equal(metadata.title, "Yoast title");
    assert.equal(metadata.description, "Yoast description");
    assert.equal(metadata.alternates.canonical, "https://lavuon.cafe/san-pham/");
    assert.equal(metadata.openGraph.title, "Social title");
    assert.equal(metadata.twitter.title, "Yoast title");
    assert.equal(metadata.robots.index, false);
    assert.equal(metadata.robots.follow, false);
});

test("page image selections are mirrored locally at build time and invalid media preserves the snapshot", async t => {
    const directory = await mkdtemp(join(tmpdir(), "coffee-page-images-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const root = pathToFileURL(`${directory}/`);
    const pages = fixture();
    const key = Object.keys(pageImageFields.about)[0];
    pages[pageFields.about.id].acf[key] = 501;
    const bytes = await readFile(new URL("../public/images/products/trung-toan-robusta-200g.webp", import.meta.url));
    let mediaUrl = "https://cms.example/photo.webp";
    let mime = "image/webp";
    let image = bytes;
    const hits = [];
    const options = { root, baseUrl: "https://cms.example/wp-json/", fetch: async (input, init) => {
        const url = new URL(input);
        hits.push(url.pathname);
        assert.equal(init.redirect, "error");
        if (url.pathname === "/photo.webp") return new Response(image, { headers: { "Content-Type": mime } });
        if (url.pathname.endsWith("/media/501")) return Response.json({ id: 501, slug: "photo", source_url: mediaUrl, alt_text: "", title: { rendered: "Photo" } });
        return Response.json(pages[Number(url.pathname.split("/").pop())]);
    } };
    await generatePages(options);
    const file = new URL("src/data/page-images.ts", root);
    const valid = await readFile(file, "utf8");
    assert.doesNotMatch(valid, /cms\.example/);
    const src = valid.match(/\/images\/pages\/wp-501-[a-f0-9]+\.webp/)[0];
    assert((await readFile(new URL(`public${src}`, root))).length > 0);
    assert.equal(hits.filter(path => path === "/photo.webp").length, 1);
    for (const badUrl of ["https://evil.example/private", "http://169.254.169.254/private"]) {
        mediaUrl = badUrl;
        await assert.rejects(generatePages(options), /Untrusted image origin/);
        assert.equal(await readFile(file, "utf8"), valid);
    }
    mediaUrl = "https://cms.example/photo.webp";
    mime = "image/svg+xml";
    await assert.rejects(generatePages(options), /Invalid image content type/);
    mime = "image/webp";
    image = Buffer.alloc(10 * 1024 * 1024 + 1);
    await assert.rejects(generatePages(options), /exceeds 10 MB/);
    image = bytes;
    pages[pageFields.about.id].acf[key] = "https://cms.example/photo.webp";
    await assert.rejects(generatePages(options), /Invalid image attachment ID/);
    assert.equal(await readFile(file, "utf8"), valid);
});
