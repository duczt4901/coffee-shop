import assert from "node:assert/strict";

const base = process.env.CHECKOUT_API_URL || "http://127.0.0.1:8787";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Run this check against a local database only");
const input = {
    checkoutId: crypto.randomUUID(),
    customer: { name: "Khách kiểm thử API", phone: "0912345678", email: "", city: "Hồ Chí Minh", ward: "Phường kiểm thử", address: "123 Đường kiểm thử" },
    items: [{ slug: "trung-toan-coffee-robusta", quantity: 2, unitPrice: 1 }],
    notes: "LOCAL_INTEGRATION_TEST",
    website: "",
    subtotal: 1,
};
const post = (body, origin = "http://localhost:3000") =>
    fetch(`${base}/api/orders`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const first = await post(input);
assert.equal(first.status, 201, await first.clone().text());
const receipt = await first.json();
assert.equal(receipt.subtotal, 238000, "Client prices must be ignored");
const repeat = await post(input);
assert.equal(repeat.status, 200);
assert.deepEqual(await repeat.json(), receipt, "Retry must return the same stored order");
assert.equal((await post({ ...input, items: [{ slug: input.items[0].slug, quantity: 3 }] })).status, 409);
assert.equal((await post({ ...input, checkoutId: crypto.randomUUID(), items: [{ slug: "missing", quantity: 1 }] })).status, 400);
assert.equal((await post(input, "https://other.example")).status, 403);
assert.equal((await fetch(`${base}/api/orders`)).status, 405);
console.log(`Passed local API integration: ${receipt.orderNumber}; server pricing, durable insert, idempotent retry, conflicts and request guards.`);
