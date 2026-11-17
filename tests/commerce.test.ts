import assert from "node:assert/strict";
import { test } from "node:test";
import { formatListingPrice, formatPrice, getShipping, readCart } from "../src/lib/commerce";
import { orderSchema, priceOrder } from "../src/lib/orders";
import worker, { handleOrder, notifyOrder, type Env } from "../worker/index";

const slug = "trung-toan-coffee-robusta";
test("enabled checkout reaches its static page and old cart URLs redirect there", async () => {
    const env = { ASSETS: { async fetch(request: Request) {
        assert(new URL(request.url).pathname.startsWith("/thanh-toan"));
        return new Response("Checkout page", { headers: { "Content-Type": "text/html" } });
    } } } as Env;
    for (const path of ["/thanh-toan", "/thanh-toan/", "/thanh-toan/index.html"]) {
        const response = await worker.fetch(new Request(`https://lavuon.example${path}`), env, { waitUntil() {} });
        assert.equal(response.status, 200);
        assert.equal(await response.text(), "Checkout page");
    }
    for (const path of ["/gio-hang", "/gio-hang/", "/gio-hang/index.html"]) {
        const response = await worker.fetch(new Request(`https://lavuon.example${path}`), env, { waitUntil() {} });
        assert.equal(response.status, 301);
        assert.equal(response.headers.get("Location"), "https://lavuon.example/thanh-toan/");
    }
});
test("enabled checkout exposes shipping config and still validates order requests", async () => {
    const context = { waitUntil() { throw new Error("Invalid requests must not create orders"); } };
    const config = await worker.fetch(new Request("https://lavuon.example/api/checkout-config"), {} as Env, context);
    assert.equal(config.status, 200);
    assert.equal((await config.json() as { shippingFee: null }).shippingFee, null);
    assert.equal(config.headers.get("Cache-Control"), "no-store");
    for (const path of ["/api/orders", "/api/orders/"]) {
        assert.equal((await worker.fetch(new Request(`https://lavuon.example${path}`), {} as Env, context)).status, 405);
        assert.equal((await worker.fetch(new Request(`https://lavuon.example${path}`, { method: "POST" }), {} as Env, context)).status, 403);
    }
});
test("catalog prices derive from one number while preserving both approved formats", () => {
    assert.equal(formatListingPrice(119000), "119.000 vnđ");
    assert.equal(formatPrice(119000), "119.000 ₫");
});
const input = {
    checkoutId: "d91b9e36-cb6a-4be2-862f-7a073d8be925",
    customer: {
        name: "Khách thử nghiệm",
        phone: "+84 912 345 678",
        email: "",
        city: "Hồ Chí Minh",
        ward: "Phường thử nghiệm",
        address: "123 Đường thử nghiệm",
    },
    items: [{ slug, quantity: 2 }],
    notes: "Không gửi đơn này",
    website: "",
};

test("cart recovers corrupt storage and rejects unavailable products and invalid quantities", () => {
    assert.deepEqual(readCart("not-json"), []);
    assert.deepEqual(readCart('{"slug":"anything"}'), []);
    assert.deepEqual(
        readCart(
            JSON.stringify([
                { slug: "deleted", quantity: 1 },
                { slug, quantity: -1 },
                { slug, quantity: 1.5 },
            ]),
        ),
        [],
    );
    assert.deepEqual(
        readCart(
            JSON.stringify([
                { slug, quantity: 60 },
                { slug, quantity: 60 },
            ]),
        ),
        [{ slug, quantity: 99 }],
    );
});

test("server prices use catalog values and reject unknown or duplicate items", () => {
    const result = priceOrder([Object.assign({ slug, quantity: 2 }, { unitPrice: 1 })], "30000");
    assert.equal(result.subtotal, 238000);
    assert.equal(result.total, 268000);
    assert.throws(() => priceOrder([{ slug: "deleted", quantity: 1 }]));
    assert.throws(() =>
        priceOrder([
            { slug, quantity: 1 },
            { slug, quantity: 1 },
        ]),
    );
});

test("shipping threshold and unconfigured fees are explicit", () => {
    assert.equal(getShipping(499999), null);
    assert.equal(getShipping(500000), 0);
    assert.equal(getShipping(499999, "30000"), 30000);
    assert.equal(getShipping(500000, "30000"), 0);
    assert.throws(() => getShipping(100000, "-1"));
    assert.throws(() => getShipping(100000, "oops"));
    assert.equal(priceOrder([{ slug, quantity: 5 }]).total, 595000);
});

test("checkout validates customer fields, normalizes phone numbers and rejects honeypot content", () => {
    assert.equal(orderSchema.parse(input).customer.phone, "0912345678");
    assert.equal(orderSchema.safeParse({ ...input, website: "bot" }).success, false);
    assert.equal(orderSchema.safeParse({ ...input, items: [{ slug, quantity: 0 }] }).success, false);
    assert.equal(orderSchema.safeParse({ ...input, customer: { ...input.customer, phone: "123" } }).success, false);
});

test("order endpoint rejects cross-origin requests, oversized bodies and malformed orders", async () => {
    const env = {} as Env;
    const context = { waitUntil() {} };
    const request = (body: unknown, origin = "http://localhost:3000") =>
        new Request("http://localhost:8787/api/orders", {
            method: "POST",
            headers: { Origin: origin, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    assert.equal((await handleOrder(request(input, "https://untrusted.example"), env, context)).status, 403);
    assert.equal((await handleOrder(request({ ...input, notes: "a".repeat(17000) }), env, context)).status, 400);
    assert.equal((await handleOrder(request({ ...input, items: [] }), env, context)).status, 400);
    assert.equal((await handleOrder(request(input), env, context)).status, 503);
    const productionRequest = new Request("https://coffee.example/api/orders", {
        method: "POST",
        headers: { Origin: "https://coffee.example", "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    assert.equal((await handleOrder(productionRequest, env, context)).status, 503, "Live orders require configured notifications");
});

test("enabled order API saves catalog prices and retries the same checkout without duplicating it", async () => {
    let saved: Record<string, unknown> | null = null;
    let inserts = 0;
    const columns = ["id", "order_number", "checkout_key", "request_hash", "customer_json", "items_json", "notes", "subtotal", "shipping_fee", "total", "ip_hash", "created_at"];
    const env = { DB: { prepare(query: string) {
        let values: unknown[] = [];
        return {
            bind(...next: unknown[]) { values = next; return this; },
            async first() { return saved; },
            async run() {
                assert(query.startsWith("INSERT INTO orders"));
                inserts++;
                saved = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
                saved.email_status = "pending";
            },
        };
    } } } as unknown as Env;
    const send = (body = input) => worker.fetch(new Request("http://localhost:8787/api/orders", {
        method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify(body),
    }), env, { waitUntil() {} });
    const first = await send();
    assert.equal(first.status, 201);
    const receipt = await first.json() as { orderNumber: string; subtotal: number; shippingFee: null; total: null };
    assert.equal(receipt.subtotal, 238000);
    assert.equal(receipt.shippingFee, null);
    const retry = await send();
    assert.equal(retry.status, 200);
    assert.deepEqual(await retry.json(), receipt);
    assert.equal(inserts, 1);
    assert.equal((await send({ ...input, items: [{ slug, quantity: 3 }] })).status, 409);
});

test("notification uses stored order prices, stable idempotency, and marks sent only after provider acceptance", async () => {
    const row = {
        id: "test-order",
        order_number: "CF-TEST",
        checkout_key: input.checkoutId,
        request_hash: "hash",
        customer_json: JSON.stringify(input.customer),
        items_json: JSON.stringify(priceOrder(input.items).lines),
        notes: input.notes,
        subtotal: 238000,
        shipping_fee: null,
        total: null,
        email_status: "pending",
        created_at: "2026-11-03T00:00:00Z",
    };
    let updates = 0;
    const env = {
        RESEND_API_KEY: "test-only",
        ORDER_EMAIL_FROM: "test@example.com",
        ORDER_NOTIFICATION_TO: "test@example.com",
        DB: {
            prepare: () => ({
                bind() {
                    return this;
                },
                async run() {
                    updates++;
                },
                async first() {
                    return null;
                },
                async all() {
                    return { results: [] };
                },
            }),
        },
        ASSETS: { fetch },
    } satisfies Env;
    let attempts = 0;
    const accepted = async (_url: unknown, init?: RequestInit) => {
        attempts++;
        assert.equal(new Headers(init?.headers).get("Idempotency-Key"), "cod-order/test-order");
        const message = JSON.parse(String(init?.body));
        assert(message.text.includes("238.000"));
        assert(message.text.includes("Cần gọi xác nhận với khách"));
        return Response.json({ id: "email-test" });
    };
    assert.equal(await notifyOrder(env, row, accepted as typeof fetch), true);
    assert.equal(updates, 1);
    assert.equal(attempts, 1);
    assert.equal(await notifyOrder(env, { ...row, email_status: "sent" }, accepted as typeof fetch), true);
    assert.equal(attempts, 1);
    assert.equal(await notifyOrder({ ...env, RESEND_API_KEY: undefined }, row, accepted as typeof fetch), false);
    assert.equal(updates, 1);
    assert.equal(await notifyOrder(env, row, (async () => new Response("unavailable", { status: 503 })) as typeof fetch), false);
    assert.equal(updates, 1);
});
