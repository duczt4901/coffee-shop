import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { generateProducts } from "../scripts/generate-products.mjs";
import { importTypeScript, typeScriptModuleURL } from "../scripts/lib/import-typescript.mjs";

const fixture = JSON.parse(await readFile(new URL("fixtures/woocommerce-product.json", import.meta.url), "utf8"));
const image = await readFile(new URL("../public/images/products/trung-toan-robusta-200g.webp", import.meta.url));
const clone = () => structuredClone(fixture);
const page = (items, total = items.length, pages = 1) => Response.json(items, { headers: { "X-WP-Total": String(total), "X-WP-TotalPages": String(pages) } });

async function workspace(t) {
    const directory = await mkdtemp(join(tmpdir(), "coffee-catalog-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const root = pathToFileURL(directory + "/");
    await mkdir(new URL("src/data/", root), { recursive: true });
    await writeFile(new URL("src/data/products.ts", root), "previous complete snapshot");
    return root;
}

test("build fetches every page once, decodes text, mirrors images and shares price/availability with the cart and Worker", async t => {
    const root = await workspace(t);
    const unavailable = { ...clone(), id: 19, slug: "het-hang", is_in_stock: false };
    const expensive = { ...clone(), id: 21, slug: "vuot-gioi-han", prices: { ...fixture.prices, price: String(Number.MAX_SAFE_INTEGER) } };
    const hits = [];
    const result = await generateProducts({ root, baseUrl: "https://cms.example/index.php/wp-json/", fetch: async (input, init) => {
        const url = new URL(String(input));
        hits.push(url.pathname + url.search);
        assert.equal(init.redirect, "error");
        assert(!init.headers.Authorization);
        if (url.pathname === "/coffee.webp") return new Response(image, { headers: { "Content-Type": "image/webp" } });
        assert.equal(url.pathname, "/index.php/wp-json/wc/store/v1/products");
        assert.equal(url.searchParams.get("orderby"), "menu_order");
        return page(url.searchParams.get("page") === "2" ? [unavailable, expensive] : [fixture], 3, 2);
    } });
    assert.equal(hits.filter(hit => hit.includes("/wc/store/")).length, 2);
    assert.equal(result[0].tagline, "Đậm & thơm.");
    assert.equal(result[0].story, "Câu chuyện sản phẩm.");
    assert.equal(result[0].origin, "Lâm Đồng, Việt Nam");
    assert.equal(result[0].varieties, "Catimor, Typica");
    assert.equal(result[0].badge, "BEST SELLER");
    assert.equal(result[0].priceVnd, 123000);
    assert.equal(result[1].available, false);
    assert.deepEqual(await readFile(new URL(`public${result[0].image}`, root)), image);
    const generated = await readFile(new URL("src/data/products.ts", root), "utf8");
    assert(!generated.includes("cms.example") && !generated.includes("wc/store/") && !generated.includes("UNSAFE_CATALOG_SCRIPT"));
    const products = typeScriptModuleURL(new URL("src/data/products.ts", root));
    const commerce = typeScriptModuleURL(new URL("../src/lib/commerce.ts", import.meta.url), { "../data/products": products });
    const { priceOrder } = await importTypeScript(new URL("../src/lib/orders.ts", import.meta.url), { zod: import.meta.resolve("zod"), "../data/products": products, "./commerce": commerce });
    assert.equal(priceOrder([{ slug: fixture.slug, quantity: 2 }], "30000").total, 276000);
    assert.throws(() => priceOrder([{ slug: unavailable.slug, quantity: 1 }]), /hết hàng/);
    assert.throws(() => priceOrder([{ slug: expensive.slug, quantity: 2 }]), /giới hạn/);
    assert.throws(() => priceOrder([{ slug: expensive.slug, quantity: 1 }, { slug: fixture.slug, quantity: 1 }]), /giới hạn/);
    const { readCart, getCartLines } = await import(commerce);
    assert.deepEqual(readCart(JSON.stringify([{ slug: unavailable.slug, quantity: 1 }])), []);
    assert.deepEqual(getCartLines([{ slug: unavailable.slug, quantity: 1 }]), []);
});

test("query-style REST base works and a new price replaces the snapshot only on the next build", async t => {
    const root = await workspace(t);
    let price = "123000";
    const send = async input => {
        const url = new URL(String(input));
        if (url.pathname === "/coffee.webp") return new Response(image, { headers: { "Content-Type": "image/webp" } });
        assert.equal(url.searchParams.get("rest_route"), "/wc/store/v1/products");
        return page([{ ...clone(), prices: { ...fixture.prices, price } }]);
    };
    await generateProducts({ root, baseUrl: "https://cms.example/?rest_route=/", fetch: send });
    const before = await readFile(new URL("src/data/products.ts", root), "utf8");
    price = "149000";
    assert.equal(await readFile(new URL("src/data/products.ts", root), "utf8"), before);
    const next = await generateProducts({ root, baseUrl: "https://cms.example/?rest_route=/", fetch: send });
    assert.equal(next[0].priceVnd, 149000);
});

test("CMS, validation and media failures preserve the complete previous snapshot", async t => {
    const badPrice = clone(); badPrice.prices.price = "9007199254740992";
    const badCurrency = clone(); badCurrency.prices.currency_code = "USD";
    const missingAttribute = clone(); missingAttribute.attributes = fixture.attributes.filter(attr => attr.name !== "Màu nền");
    const untrustedImage = clone(); untrustedImage.images[0].src = "http://169.254.169.254/private";
    for (const [name, send] of [
        ["HTTP failure", async () => new Response("upstream failed", { status: 503 })],
        ["network failure", async () => { throw new Error("offline"); }],
        ["HTML response", async () => new Response("<html>hosting error</html>")],
        ["missing pagination", async () => Response.json([fixture])],
        ["empty catalog", async () => page([], 0, 0)],
        ["duplicate products", async () => page([fixture, fixture])],
        ["invalid price", async input => String(input).includes("coffee.webp") ? new Response(image, { headers: { "Content-Type": "image/webp" } }) : page([badPrice])],
        ["wrong currency", async () => page([badCurrency])],
        ["missing attribute", async input => String(input).includes("coffee.webp") ? new Response(image, { headers: { "Content-Type": "image/webp" } }) : page([missingAttribute])],
        ["untrusted image", async () => page([untrustedImage])],
        ["invalid image", async input => String(input).includes("coffee.webp") ? new Response("not an image", { headers: { "Content-Type": "text/html" } }) : page([fixture])],
        ["pagination changes", async input => page([fixture], new URL(String(input)).searchParams.get("page") === "2" ? 3 : 2, 2)],
    ]) await t.test(name, async subtest => {
        const root = await workspace(subtest);
        await assert.rejects(generateProducts({ root, baseUrl: "https://cms.example/wp-json/", fetch: send }));
        assert.equal(await readFile(new URL("src/data/products.ts", root), "utf8"), "previous complete snapshot");
    });
});
