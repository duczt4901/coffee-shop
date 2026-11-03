import { orderSchema, priceOrder } from "../src/lib/orders";
import { formatPrice, FREE_SHIPPING_THRESHOLD, getShipping } from "../src/lib/commerce";

interface Statement {
    bind(...values: unknown[]): Statement;
    first<T>(): Promise<T | null>;
    all<T>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
}
export interface Env {
    ASSETS: { fetch(request: Request): Promise<Response> };
    DB: { prepare(query: string): Statement };
    RESEND_API_KEY?: string;
    ORDER_EMAIL_FROM?: string;
    ORDER_NOTIFICATION_TO: string;
    SHIPPING_FEE_VND?: string;
}
type OrderRow = {
    id: string;
    order_number: string;
    checkout_key: string;
    request_hash: string;
    customer_json: string;
    items_json: string;
    notes: string;
    subtotal: number;
    shipping_fee: number | null;
    total: number | null;
    email_status: string;
    created_at: string;
};
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const receipt = (row: OrderRow) => ({ orderNumber: row.order_number, subtotal: row.subtotal, shippingFee: row.shipping_fee, total: row.total });
async function hash(value: string) {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function readBody(request: Request) {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("invalid_body");
    const decoder = new TextDecoder();
    let size = 0,
        text = "";
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 16000) {
                await reader.cancel();
                throw new Error("body_too_large");
            }
            text += decoder.decode(value, { stream: true });
        }
        return JSON.parse(text + decoder.decode());
    } finally {
        reader.releaseLock();
    }
}

export async function notifyOrder(env: Env, order: OrderRow, send: typeof fetch = fetch) {
    if (order.email_status === "sent") return true;
    if (!env.RESEND_API_KEY || !env.ORDER_EMAIL_FROM || !env.ORDER_NOTIFICATION_TO) return false;
    const customer = JSON.parse(order.customer_json);
    const lines: ReturnType<typeof priceOrder>["lines"] = JSON.parse(order.items_json);
    const text = [
        `Đơn COD mới: ${order.order_number}`,
        `Thời gian: ${order.created_at}`,
        "",
        `Khách hàng: ${customer.name}`,
        `Điện thoại: ${customer.phone}`,
        `Email: ${customer.email || "Không có"}`,
        `Địa chỉ: ${customer.address}, ${customer.ward}, ${customer.city}`,
        "",
        ...lines.map((line) => `${line.name} · ${line.sizeLabel} × ${line.quantity}: ${formatPrice(line.lineTotal)}`),
        "",
        `Tiền hàng: ${formatPrice(order.subtotal)}`,
        `Giao hàng: ${order.shipping_fee === null ? "Cần gọi xác nhận với khách" : formatPrice(order.shipping_fee)}`,
        `COD: ${order.total === null ? `${formatPrice(order.subtotal)} + phí giao hàng cần xác nhận` : formatPrice(order.total)}`,
        `Ghi chú: ${order.notes || "Không có"}`,
    ].join("\n");
    try {
        const result = await send("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `cod-order/${order.id}` },
            body: JSON.stringify({
                from: env.ORDER_EMAIL_FROM,
                to: [env.ORDER_NOTIFICATION_TO],
                reply_to: customer.email || undefined,
                subject: `Đơn COD mới · ${order.order_number}`,
                text,
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!result.ok) throw new Error(`email_http_${result.status}`);
        const resultBody = (await result.json()) as { id?: string };
        if (!resultBody.id) throw new Error("email_missing_id");
        await env.DB.prepare("UPDATE orders SET email_status = 'sent', email_sent_at = ? WHERE id = ?").bind(new Date().toISOString(), order.id).run();
        return true;
    } catch {
        console.error("Order notification pending", order.id);
        return false;
    }
}

export async function handleOrder(request: Request, env: Env, context: { waitUntil(promise: Promise<unknown>): void }) {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    let sameOrigin = origin === url.origin;
    if (local && origin) {
        try {
            sameOrigin = ["localhost", "127.0.0.1"].includes(new URL(origin).hostname);
        } catch {
            sameOrigin = false;
        }
    }
    if (!sameOrigin) return json({ error: "Nguồn gửi đơn không hợp lệ." }, 403);
    if (!request.headers.get("Content-Type")?.includes("application/json")) return json({ error: "Dữ liệu gửi không hợp lệ." }, 415);
    let body: unknown;
    try {
        body = await readBody(request);
    } catch {
        return json({ error: "Dữ liệu đơn hàng không hợp lệ hoặc quá lớn." }, 400);
    }
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Vui lòng kiểm tra họ tên, số điện thoại, địa chỉ và sản phẩm trong đơn." }, 400);
    if (!local && (!env.RESEND_API_KEY || !env.ORDER_EMAIL_FROM || !env.ORDER_NOTIFICATION_TO)) {
        return json({ error: "Cửa hàng chưa thể nhận đơn lúc này. Vui lòng thử lại sau." }, 503);
    }
    if (!env.DB) return json({ error: "Cửa hàng chưa thể nhận đơn lúc này. Vui lòng thử lại sau." }, 503);
    const input = parsed.data;
    const requestHash = await hash(JSON.stringify(input));
    try {
        const existing = await env.DB.prepare("SELECT * FROM orders WHERE checkout_key = ?").bind(input.checkoutId).first<OrderRow>();
        if (existing) {
            if (existing.request_hash !== requestHash) return json({ error: "Thông tin đơn đã thay đổi. Vui lòng tải lại và thử lại." }, 409);
            context.waitUntil(notifyOrder(env, existing));
            return json(receipt(existing));
        }
        let priced: ReturnType<typeof priceOrder>;
        try {
            priced = priceOrder(input.items, env.SHIPPING_FEE_VND);
        } catch {
            return json({ error: "Sản phẩm hoặc phí giao hàng chưa hợp lệ. Vui lòng thử lại sau." }, 400);
        }
        const id = crypto.randomUUID();
        const number = `CF-${id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
        const ipHash = await hash(`${url.hostname}:${request.headers.get("CF-Connecting-IP") || "local"}`);
        await env.DB.prepare(
            "INSERT INTO orders (id, order_number, checkout_key, request_hash, customer_json, items_json, notes, subtotal, shipping_fee, total, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(checkout_key) DO NOTHING",
        )
            .bind(
                id,
                number,
                input.checkoutId,
                requestHash,
                JSON.stringify(input.customer),
                JSON.stringify(priced.lines),
                input.notes,
                priced.subtotal,
                priced.shippingFee,
                priced.total,
                ipHash,
                new Date().toISOString(),
            )
            .run();
        const saved = await env.DB.prepare("SELECT * FROM orders WHERE checkout_key = ?").bind(input.checkoutId).first<OrderRow>();
        if (!saved) throw new Error("order_not_saved");
        if (saved.request_hash !== requestHash) return json({ error: "Thông tin đơn đã thay đổi. Vui lòng thử lại." }, 409);
        context.waitUntil(notifyOrder(env, saved));
        return json(receipt(saved), 201);
    } catch (error) {
        if (error instanceof Error && error.message.includes("order_rate_limited"))
            return json({ error: "Bạn đã gửi nhiều đơn trong thời gian ngắn. Vui lòng thử lại sau 15 phút." }, 429);
        console.error("Order storage failed");
        return json({ error: "Chưa lưu được đơn hàng. Vui lòng thử lại; đơn sẽ không bị tạo trùng." }, 503);
    }
}

const worker = {
    async fetch(request: Request, env: Env, context: { waitUntil(promise: Promise<unknown>): void }) {
        const path = new URL(request.url).pathname.replace(/\/$/, "");
        if (path === "/api/checkout-config" && request.method === "GET") {
            try {
                return json({ shippingFee: getShipping(0, env.SHIPPING_FEE_VND), freeShippingThreshold: FREE_SHIPPING_THRESHOLD });
            } catch {
                return json({ error: "Phí giao hàng chưa được cấu hình." }, 503);
            }
        }
        if (path === "/api/orders") {
            if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
            return handleOrder(request, env, context);
        }
        if (path.startsWith("/api/")) return json({ error: "Not found" }, 404);
        return env.ASSETS.fetch(request);
    },
    async scheduled(_event: unknown, env: Env) {
        const pending = await env.DB.prepare("SELECT * FROM orders WHERE email_status = 'pending' ORDER BY created_at ASC LIMIT 10").all<OrderRow>();
        for (const order of pending.results) {
            if (!(await notifyOrder(env, order))) break;
        }
    },
};
export default worker;
