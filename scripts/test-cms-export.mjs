import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { pageFields } from "./generate-pages.mjs";

const post = {
    id: 42,
    slug: "ca-phe-moc",
    status: "publish",
    categories: [7],
    tags: [],
    title: { rendered: "Cà phê &amp; vườn" },
    excerpt: { rendered: "<p>Từ nông trại đến tách.</p>", protected: false },
    content: {
        rendered: '<p>Nội dung kiểm thử <strong>cà phê</strong>.</p><script>CMS_UNSAFE_SCRIPT()</script><img src="https://example.com/coffee.jpg" alt="Cà phê" onerror="CMS_UNSAFE_SCRIPT()">',
        protected: false,
    },
};
const category = { id: 7, slug: "vuon", name: "Vườn", description: "", count: 2 };
const product = JSON.parse(readFileSync("tests/fixtures/woocommerce-product.json", "utf8"));
const productImage = readFileSync("public/images/products/trung-toan-robusta-200g.webp");
const generatedFiles = ["src/data/products.ts", "src/data/page-content.ts", "src/data/page-images.ts", "src/data/image-placeholders.json", "src/data/responsive-images.json"];
const previous = generatedFiles.map(file => readFileSync(file));
const hits = [];
const server = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    const route = url.searchParams.get("rest_route") ?? url.pathname.replace("/index.php/wp-json", "");
    hits.push(route);
    const config = Object.values(pageFields).find(page => route === `/wp/v2/pages/${page.id}`);
    if (config) {
        const acf = Object.fromEntries(Object.entries(config.fields).map(([key, field]) => [key, field.default]));
        if (config.path === "/san-pham/") acf.products_h1_1 = "CMS Trang sản phẩm";
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ id: config.id, status: "publish", acf, yoast_head_json: { title: `CMS SEO ${config.title}`, description: "Mô tả SEO từ WordPress", canonical: "https://cms.example/", robots: { index: "noindex" } } }));
        return;
    }
    if (route === "/fixture-product.webp") {
        response.writeHead(200, { "Content-Type": "image/webp" });
        response.end(productImage);
        return;
    }
    const items = route === "/wp/v2/posts" ? [post, { ...post, id: 43, slug: "c%C3%A0-ph%C3%AA" }] : route === "/wp/v2/categories" ? [category]
        : route === "/wc/store/v1/products" ? [{ ...product, images: [{ src: `http://${request.headers.host}/fixture-product.webp` }] }] : null;
    response.writeHead(items ? 200 : 404, { "Content-Type": "application/json", "X-WP-Total": String(items?.length ?? 0), "X-WP-TotalPages": items ? "1" : "0" });
    response.end(JSON.stringify(items ?? { code: "rest_no_route" }));
});
await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
});
function run(args, env = process.env) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, args, { stdio: "inherit", env });
        child.once("error", reject);
        child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Command failed with exit ${code}`))));
    });
}
try {
    const { port } = server.address();
    const env = { ...process.env, WORDPRESS_API_BASE_URL: `http://127.0.0.1:${port}/index.php/wp-json/`, WOOCOMMERCE_API_BASE_URL: `http://127.0.0.1:${port}/index.php/wp-json/` };
    await run(["scripts/generate-products.mjs"], env);
    await run(["scripts/generate-pages.mjs"], env);
    await run(["scripts/generate-image-placeholders.mjs"], env);
    await run(["node_modules/next/dist/bin/next", "build"], env);
    await run(["scripts/finalize-static-export.mjs"], env);
    await run(["scripts/check-static-export.mjs"]);
    assert.ok(hits.includes("/wp/v2/posts") && hits.includes("/wp/v2/categories"));
    const html = readFileSync("out/bai-viet/ca-phe-moc/index.html", "utf8");
    assert.ok(html.includes("<strong>cà phê</strong>"));
    assert.ok(!html.includes("CMS_UNSAFE_SCRIPT"));
    assert.ok(html.includes('href="https://lavuon.cafe/bai-viet/ca-phe-moc/"'));
    assert.ok(existsSync("out/bai-viet/chuyen-muc/vuon/index.html"));
    assert.ok(existsSync("out/bai-viet/cà-phê/index.html") || existsSync("out/bai-viet/c%C3%A0-ph%C3%AA/index.html"));
    const productHtml = readFileSync(`out/san-pham/${product.slug}/index.html`, "utf8");
    assert.ok(productHtml.includes(product.name) && productHtml.includes("123.000"), "WooCommerce name and price must already be in static HTML");
    assert.ok(productHtml.includes("BEST SELLER") || readFileSync("out/san-pham/index.html", "utf8").includes("BEST SELLER"));
    assert.ok(!productHtml.includes("UNSAFE_CATALOG_SCRIPT") && !productHtml.includes(`127.0.0.1:${port}`), "No unsafe content or CMS assets may reach HTML");
    assert.equal(hits.filter(route => route === "/wc/store/v1/products").length, 1, "Only the prebuild may fetch the catalog");
    assert.equal(hits.filter(route => route === "/fixture-product.webp").length, 1, "Images are mirrored once during prebuild");
    const listing = readFileSync("out/san-pham/index.html", "utf8");
    assert.ok(listing.includes("CMS Trang sản phẩm") && listing.includes("CMS SEO Sản phẩm") && listing.includes("Mô tả SEO từ WordPress"), "Page copy and Yoast must be present in exported HTML");
    assert.ok(!listing.includes("cms.example"), "CMS canonical must not override the public frontend");
    assert.match(listing, /name="robots" content="noindex, nofollow"/, "Frontend indexing remains disabled");
    for (const config of Object.values(pageFields)) assert.equal(hits.filter(route => route === `/wp/v2/pages/${config.id}`).length, 1, "Pages are fetched only by prebuild");
    console.log("CMS fixture static export passed. out/ contains test content; rebuild with your real configuration before publishing.");
} finally {
    generatedFiles.forEach((file, index) => writeFileSync(file, previous[index]));
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
}
