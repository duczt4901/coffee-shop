import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve("out");
const origin = "https://lavuon.cafe";
assert.ok(existsSync(join(root, "index.html")), "Run the production build first");
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
assert.ok(locations.length >= 2, "Sitemap must contain public pages");
for (const url of locations) {
    assert.equal(url.origin, origin, "Sitemap must use the public domain");
    assert.ok(!/^\/(gio-hang|thanh-toan)(\/|$)/.test(url.pathname), "Private commerce pages must not enter the sitemap");
    const paths = [url.pathname, decodeURIComponent(url.pathname)].map((path) => resolve(root, `.${path}`, "index.html"));
    assert.ok(
        paths.some((path) => path.startsWith(root + "/") || path.startsWith(root + "\\")),
        "Export path must stay inside out",
    );
    assert.ok(
        paths.some((path) => existsSync(path)),
        `Missing static page for ${url.pathname}`,
    );
}
assert.ok(readFileSync(join(root, "robots.txt"), "utf8").includes(`Sitemap: ${origin}/sitemap.xml`), "robots.txt sitemap domain differs");

let pages = 0;
function inspect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) inspect(path);
        else if (/\.(html|js|json|txt)$/.test(entry.name)) {
            const contents = readFileSync(path, "utf8");
            assert.ok(!/\b(?:ck|cs)_[a-f0-9]{40}\b/i.test(contents), "WooCommerce credential-shaped value in public export");
            if (entry.name.endsWith(".html")) {
                pages++;
                for (const canonical of contents.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g)) {
                    assert.equal(new URL(canonical[1]).origin, origin, `Wrong canonical in ${path}`);
                }
                const articleSchemas = [...contents.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
                    .map((match) => JSON.parse(match[1]))
                    .filter((schema) => schema["@type"] === "Article");
                assert.ok(articleSchemas.length <= 1, `Duplicate Article schema in ${path}`);
            }
        }
    }
}
inspect(root);
console.log(`Static export verified: ${pages} HTML files, ${locations.length} sitemap URLs, public canonical domain, no WooCommerce key patterns.`);
