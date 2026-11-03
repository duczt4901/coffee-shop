"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/Button";
import { formatPrice, FREE_SHIPPING_THRESHOLD } from "@/lib/commerce";
import { useCart } from "./useCart";
import styles from "./Commerce.module.css";

type Receipt = { orderNumber: string; subtotal: number; shippingFee: number | null; total: number | null };

export function CheckoutPage() {
    const cart = useCart();
    const [fee, setFee] = useState<number | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const attempt = useRef({ signature: "", id: "" });
    const pending = useRef(false);
    const receiptRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const controller = new AbortController();
        fetch("/api/checkout-config", { signal: controller.signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((config) => {
                if (config && (config.shippingFee === null || (Number.isSafeInteger(config.shippingFee) && config.shippingFee >= 0)))
                    setFee(config.shippingFee);
            })
            .catch(() => {});
        return () => controller.abort();
    }, []);
    useEffect(() => {
        if (receipt) receiptRef.current?.focus();
    }, [receipt]);
    const shipping = cart.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : fee;
    const submit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pending.current || !cart.items.length) return;
        const form = new FormData(event.currentTarget);
        const customer = Object.fromEntries(["name", "phone", "email", "city", "ward", "address"].map((key) => [key, String(form.get(key) ?? "").trim()]));
        const payload = { customer, notes: String(form.get("notes") ?? "").trim(), items: cart.items, website: String(form.get("website") ?? "") };
        const signature = JSON.stringify(payload);
        if (attempt.current.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
        pending.current = true;
        setSending(true);
        setError("");
        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, checkoutId: attempt.current.id }),
                signal: AbortSignal.timeout(15000),
            });
            if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("Chưa kết nối được với cửa hàng. Vui lòng thử lại sau.");
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Chưa thể gửi đơn. Vui lòng thử lại.");
            setReceipt(result);
            cart.clear();
        } catch (cause) {
            setError(
                cause instanceof Error && !(cause instanceof TypeError) && !(cause instanceof DOMException)
                    ? cause.message
                    : "Kết nối bị gián đoạn. Vui lòng thử lại; đơn sẽ không bị tạo trùng.",
            );
        } finally {
            pending.current = false;
            setSending(false);
        }
    };

    return (
        <article className={styles.page}>
            <div className={styles.container}>
                <nav aria-label="Các bước đặt hàng" className={styles.steps}>
                    <Link href="/gio-hang/">01 / Giỏ hàng</Link>
                    <Link href="/thanh-toan/" aria-current="step">
                        02 / Thanh toán
                    </Link>
                </nav>
                <h1 className={styles.heading}>{receipt ? "Cảm ơn bạn." : "Thanh toán"}</h1>
                {receipt ? (
                    <div ref={receiptRef} tabIndex={-1} className={styles.receipt} role="status">
                        <p className={styles.receiptId}>Đơn hàng {receipt.orderNumber}</p>
                        <p>Đơn hàng đã được ghi nhận. Cửa hàng sẽ liên hệ qua số điện thoại của bạn để xác nhận trước khi giao.</p>
                        <p>
                            <strong>
                                {receipt.total === null ? "Tiền hàng" : "Thanh toán khi nhận hàng"}: {formatPrice(receipt.total ?? receipt.subtotal)}
                            </strong>
                            {receipt.shippingFee === null && (
                                <>
                                    <br />
                                    Phí giao hàng sẽ được xác nhận qua điện thoại.
                                </>
                            )}
                        </p>
                        <Button href="/san-pham/">Tiếp tục mua sắm</Button>
                    </div>
                ) : !cart.ready ? (
                    <p role="status">Đang tải đơn hàng…</p>
                ) : !cart.items.length ? (
                    <div className={styles.empty}>
                        <p>Chưa có sản phẩm để thanh toán.</p>
                        <Button href="/san-pham/">Xem sản phẩm</Button>
                    </div>
                ) : (
                    <form onSubmit={submit} className={styles.layout}>
                        <fieldset disabled={sending} className={styles.form}>
                            <legend className={styles.sectionTitle}>Thông tin giao hàng</legend>
                            <div className={styles.fields}>
                                <label className={`${styles.field} ${styles.wide}`}>
                                    Họ và tên *<input name="name" required autoComplete="name" minLength={2} maxLength={100} />
                                </label>
                                <label className={styles.field}>
                                    Số điện thoại *
                                    <input
                                        name="phone"
                                        type="tel"
                                        inputMode="tel"
                                        required
                                        autoComplete="tel"
                                        pattern="(0|\+84)[0-9\s.\-]{9,14}"
                                        maxLength={20}
                                        title="Nhập số điện thoại Việt Nam, bắt đầu bằng 0 hoặc +84"
                                    />
                                </label>
                                <label className={styles.field}>
                                    Email (không bắt buộc)
                                    <input name="email" type="email" autoComplete="email" maxLength={254} />
                                </label>
                                <label className={styles.field}>
                                    Tỉnh / Thành phố *<input name="city" required autoComplete="address-level1" maxLength={100} />
                                </label>
                                <label className={styles.field}>
                                    Phường / Xã *<input name="ward" required autoComplete="address-level2" maxLength={100} />
                                </label>
                                <label className={`${styles.field} ${styles.wide}`}>
                                    Số nhà, tên đường *<input name="address" required autoComplete="street-address" minLength={5} maxLength={300} />
                                </label>
                                <label className={`${styles.field} ${styles.wide}`}>
                                    Ghi chú giao hàng (không bắt buộc)
                                    <textarea name="notes" maxLength={1000} />
                                </label>
                                <label hidden aria-hidden="true">
                                    Website
                                    <input name="website" tabIndex={-1} autoComplete="off" />
                                </label>
                            </div>
                            <div className={styles.payment}>
                                <h3>Thanh toán khi nhận hàng (COD)</h3>
                                <p className={styles.muted}>
                                    Bạn thanh toán trực tiếp cho đơn vị giao hàng. Cửa hàng sẽ gọi xác nhận thông tin và phí giao hàng trước khi gửi đơn.
                                </p>
                            </div>
                        </fieldset>
                        <aside className={styles.summary}>
                            <h2>Đơn hàng của bạn</h2>
                            <dl>
                                {cart.lines.map((line) => (
                                    <div key={line.slug} className={styles.summaryRow}>
                                        <dt>
                                            {line.product.name}
                                            <br />
                                            <span className={styles.muted}>
                                                {line.product.sizeLabel} × {line.quantity}
                                            </span>
                                        </dt>
                                        <dd>{formatPrice(line.lineTotal)}</dd>
                                    </div>
                                ))}
                                <div className={styles.summaryRow}>
                                    <dt>Tạm tính</dt>
                                    <dd>{formatPrice(cart.subtotal)}</dd>
                                </div>
                                <div className={styles.summaryRow}>
                                    <dt>Giao hàng</dt>
                                    <dd>{shipping === null ? "Cửa hàng xác nhận" : shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</dd>
                                </div>
                                <div className={`${styles.summaryRow} ${styles.total}`}>
                                    <dt>{shipping === null ? "Tổng tiền hàng" : "Tổng thanh toán"}</dt>
                                    <dd>{formatPrice(cart.subtotal + (shipping ?? 0))}</dd>
                                </div>
                            </dl>
                            {error && (
                                <p role="alert" className={styles.error}>
                                    {error}
                                </p>
                            )}
                            <Button type="submit" fullWidth disabled={sending}>
                                {sending ? "Đang gửi đơn…" : "Đặt hàng COD ↗"}
                            </Button>
                            <p className={styles.summaryNote}>
                                {shipping === null
                                    ? "Chưa bao gồm phí giao hàng. Cửa hàng sẽ xác nhận khoản phí này với bạn trước khi gửi hàng."
                                    : "Không cần thanh toán trước."}
                            </p>
                            <Link href="/gio-hang/" className={`${styles.textLink} ${styles.continue}`}>
                                Chỉnh sửa giỏ hàng
                            </Link>
                        </aside>
                    </form>
                )}
            </div>
        </article>
    );
}
