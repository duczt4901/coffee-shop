import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importTypeScript } from "./lib/import-typescript.mjs";

const { createWordPressClient } = await importTypeScript(new URL("../src/lib/wordpress.ts", import.meta.url), { zod: import.meta.resolve("zod") });
const { wordPressText } = await importTypeScript(new URL("../src/lib/wordpress-content.ts", import.meta.url), { "sanitize-html": import.meta.resolve("sanitize-html") });
export const pageFields = JSON.parse(await readFile(new URL("../wordpress/page-fields.json", import.meta.url), "utf8"));
export const pageImageFields = JSON.parse(await readFile(new URL("../wordpress/page-image-fields.json", import.meta.url), "utf8"));
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

export async function generatePages({ baseUrl = process.env.WOOCOMMERCE_API_BASE_URL || "https://lavuon.cu.ma/index.php/wp-json/", fetch: send = fetch, root = new URL("../", import.meta.url) } = {}) {
    const client = createWordPressClient({ baseUrl, fetch: send });
    const exports = [];
    const seo = {};
    const images = [];
    const assets = new Map();
    const media = new Map();
    async function imageFor(value, field, label) {
        if (value === undefined || value === null || value === false || value === "" || value === 0) return field.default;
        assert(Number.isSafeInteger(value) && value > 0, `Invalid image attachment ID for ${label}`);
        if (!media.has(value)) media.set(value, (async () => {
            const item = await client.getMediaItem(value);
            assert.equal(item.id, value, `Unexpected media ID for ${label}`);
            const url = new URL(item.source_url);
            assert(url.origin === new URL(baseUrl).origin && !url.username && !url.password && !url.hash, `Untrusted image origin for ${label}`);
            const response = await send(url, { headers: { Accept: "image/webp,image/png,image/jpeg", Connection: "close" }, redirect: "error", signal: AbortSignal.timeout(15000) });
            assert(response.ok, `Image for ${label} returned HTTP ${response.status}`);
            assert(/^image\/(webp|png|jpeg)(?:;|$)/i.test(response.headers.get("Content-Type") ?? ""), `Invalid image content type for ${label}`);
            const chunks = [];
            let size = 0;
            for await (const chunk of response.body) {
                size += chunk.length;
                assert(size <= 10 * 1024 * 1024, `Image for ${label} exceeds 10 MB`);
                chunks.push(chunk);
            }
            const input = Buffer.concat(chunks);
            const info = await sharp(input, { limitInputPixels: 40000000 }).metadata();
            assert(["webp", "png", "jpeg"].includes(info.format) && info.width > 0 && info.height > 0 && !info.pages, `Unsupported image for ${label}`);
            const bytes = await sharp(input, { limitInputPixels: 40000000 }).rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
            const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
            const src = `/images/pages/wp-${value}-${digest}.webp`;
            assets.set(src, bytes);
            return { src, alpha: info.hasAlpha };
        })());
        const image = await media.get(value);
        assert(!field.transparent || image.alpha, `Image ${label} needs a transparent PNG or WebP`);
        return image.src;
    }
    for (const [name, config] of Object.entries(pageFields)) {
        const page = await client.getPage(config.id).catch(error => {
            throw new Error(`Cannot read ${config.title} (Page ${config.id}). Check ACF Show in REST API and Yoast SEO: ${error.message}`);
        });
        assert.equal(page.id, config.id, `Unexpected WordPress page for ${config.path}`);
        const fields = {};
        for (const key of Object.keys(config.fields)) {
            const value = page.acf[key];
            assert(typeof value === "string" && value.length <= 10000, `Missing or invalid field ${name}.${key}`);
            fields[key] = wordPressText(value);
            if (key.includes("_email_")) assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields[key]), `Invalid contact email ${key}`);
        }
        exports.push(`export const ${name}Content = ${JSON.stringify(fields, null, 4)};`);
        const pageImages = {};
        for (const [key, field] of Object.entries(pageImageFields[name] ?? {})) pageImages[key] = await imageFor(page.acf[key], field, `${name}.${key}`);
        images.push(`export const ${name}Images = ${JSON.stringify(pageImages, null, 4)};`);
        const head = page.yoast_head_json;
        seo[config.path] = Object.fromEntries(Object.entries({ title: head.title, description: head.description, ogTitle: head.og_title, ogDescription: head.og_description, twitterTitle: head.twitter_title, twitterDescription: head.twitter_description })
            .filter(([, value]) => value).map(([key, value]) => [key, wordPressText(value)]));
    }
    // Publish only a complete snapshot. CMS errors must fail the build, leaving the previous deploy intact.
    const target = new URL("src/data/page-content.ts", root);
    const source = `// Generated by scripts/generate-pages.mjs. Edit content in WordPress Pages.\n${exports.join("\n\n")}\n\nexport const pageSeo: Record<string, {title?: string; description?: string; ogTitle?: string; ogDescription?: string; twitterTitle?: string; twitterDescription?: string}> = ${JSON.stringify(seo, null, 4)};\n`;
    await mkdir(new URL("src/data/", root), { recursive: true });
    await mkdir(new URL("public/images/pages/", root), { recursive: true });
    for (const [path, bytes] of assets) await writeFile(new URL(`public${path}`, root), bytes);
    const imageTarget = new URL("src/data/page-images.ts", root);
    await writeFile(`${fileURLToPath(imageTarget)}.tmp`, `// Generated by scripts/generate-pages.mjs. Select images in WordPress Pages.\n${images.join("\n\n")}\n`);
    await writeFile(`${fileURLToPath(target)}.tmp`, source);
    await rename(`${fileURLToPath(imageTarget)}.tmp`, imageTarget);
    await rename(`${fileURLToPath(target)}.tmp`, target);
    return seo;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const require = createRequire(import.meta.url);
    createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd());
    try {
        await generatePages();
        console.log("Saved WordPress page content and Yoast SEO for 6 static pages.");
    } catch (error) {
        console.error(`Page sync failed: ${error.message}`);
        process.exitCode = 1;
    }
}
