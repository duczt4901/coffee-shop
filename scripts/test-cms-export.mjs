import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";

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
const hits = [];
const server = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    const route = url.searchParams.get("rest_route") ?? url.pathname.replace("/index.php/wp-json", "");
    hits.push(route);
    const items = route === "/wp/v2/posts" ? [post, { ...post, id: 43, slug: "c%C3%A0-ph%C3%AA" }] : route === "/wp/v2/categories" ? [category] : null;
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
    const env = { ...process.env, WORDPRESS_API_BASE_URL: `http://127.0.0.1:${port}/index.php/wp-json/` };
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
    console.log("CMS fixture static export passed. out/ contains test content; rebuild with your real configuration before publishing.");
} finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
}
