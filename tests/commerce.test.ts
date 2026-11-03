import assert from "node:assert/strict";
import { test } from "node:test";
import { getShipping, readCart } from "../src/lib/commerce";
import { orderSchema, priceOrder } from "../src/lib/orders";
import { handleOrder, notifyOrder, type Env } from "../worker/index";

const slug = "trung-toan-coffee-robusta";
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
