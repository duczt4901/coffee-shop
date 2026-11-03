"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatPrice, FREE_SHIPPING_THRESHOLD } from "@/lib/commerce";
import { Quantity } from "./Quantity";
import { useCart } from "./useCart";
import styles from "./Commerce.module.css";

export function CartPage() {
    const cart = useCart();
    return (
        <article className={styles.page}>
            <div className={styles.container}>
                <nav aria-label="Các bước đặt hàng" className={styles.steps}>
                    <Link href="/gio-hang/" aria-current="step">
                        01 / Giỏ hàng
                    </Link>
                    <Link href="/thanh-toan/">02 / Thanh toán</Link>
                </nav>
                <h1 className={styles.heading}>
                    Giỏ hàng<span className="ml-4 align-top font-sans text-base tracking-normal">({cart.count})</span>
                </h1>
                {!cart.ready ? (
                    <p role="status">Đang tải giỏ hàng…</p>
                ) : !cart.items.length ? (
                    <div className={styles.empty}>
                        <p>Giỏ hàng của bạn đang trống. Chọn một hương vị cà phê cho ngày mới.</p>
                        <Button href="/san-pham/">Xem sản phẩm</Button>
                    </div>
                ) : (
                    <div className={styles.layout}>
                        <div>
                            <ul className={styles.items}>
                                {cart.lines.map(({ product, quantity, lineTotal }) => (
                                    <li key={product.slug} className={styles.item}>
                                        <Link href={`/san-pham/${product.slug}/`} className={styles.itemImage} tabIndex={-1} aria-hidden="true">
                                            <Image src={product.image} alt="" width={120} height={140} />
                                        </Link>
                                        <div>
                                            <Link href={`/san-pham/${product.slug}/`} className={styles.itemTitle}>
                                                {product.name}
                                            </Link>
                                            <p className={styles.muted}>
                                                {product.sizeLabel} · {formatPrice(product.priceVnd)} / gói
                                            </p>
                                            <div className={styles.itemActions}>
                                                <Quantity
                                                    label={`Số lượng ${product.name}`}
                                                    value={quantity}
                                                    onChange={(next) => cart.update(product.slug, next)}
                                                />
                                                <button
                                                    type="button"
                                                    className={styles.remove}
                                                    aria-label={`Xóa ${product.name}`}
                                                    onClick={() => cart.remove(product.slug)}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>
                                        <span className={styles.itemPrice}>{formatPrice(lineTotal)}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/san-pham/" className={`${styles.textLink} ${styles.continue}`}>
                                ← Tiếp tục mua sắm
                            </Link>
                        </div>
                        <aside className={styles.summary} aria-label="Tổng giỏ hàng">
                            <h2>Đơn hàng của bạn</h2>
                            <dl>
                                <div className={styles.summaryRow}>
                                    <dt>Tạm tính</dt>
                                    <dd>{formatPrice(cart.subtotal)}</dd>
                                </div>
                                <div className={styles.summaryRow}>
                                    <dt>Giao hàng</dt>
                                    <dd>{cart.subtotal >= FREE_SHIPPING_THRESHOLD ? "Miễn phí" : "Xác nhận khi đặt hàng"}</dd>
                                </div>
                                <div className={`${styles.summaryRow} ${styles.total}`}>
                                    <dt>Tổng tiền hàng</dt>
                                    <dd>{formatPrice(cart.subtotal)}</dd>
                                </div>
                            </dl>
                            <Button href="/thanh-toan/" fullWidth>
                                Tiến hành thanh toán ↗
                            </Button>
                            <p className={styles.summaryNote}>
                                {cart.subtotal >= FREE_SHIPPING_THRESHOLD
                                    ? "Đơn hàng của bạn được miễn phí giao hàng."
                                    : `Mua thêm ${formatPrice(FREE_SHIPPING_THRESHOLD - cart.subtotal)} để được miễn phí giao hàng.`}
                            </p>
                            <p className={styles.summaryNote}>Thanh toán khi nhận hàng (COD).</p>
                        </aside>
                    </div>
                )}
            </div>
        </article>
    );
}
