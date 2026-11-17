"use client";

import { SkeletonImage as Image } from "@/components/ui/SkeletonImage";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RevealLine } from "@/components/ui/EditorialReveal";
import { LinkMarker } from "@/components/ui/LinkMarker";
import { formatPrice, FREE_SHIPPING_THRESHOLD } from "@/lib/commerce";
import { Quantity } from "./Quantity";
import { useCart } from "./useCart";
import { ZALO_PHONE, ZALO_URL } from "@/data/contact";
import styles from "./Commerce.module.css";

export function CartPage() {
    const cart = useCart();
    const [status, setStatus] = useState("");
    const emptyRef = useRef<HTMLDivElement>(null);
    const focusAfterRemove = useRef<string | null>(null);
    useLayoutEffect(() => {
        const slug = focusAfterRemove.current;
        if (slug === null) return;
        focusAfterRemove.current = null;
        const target = slug ? document.getElementById(`cart-item-${slug}`) : emptyRef.current;
        target?.querySelector<HTMLElement>(slug ? "button:not(:disabled), input" : "a")?.focus();
    }, [cart.lines]);
    return (
        <article className={styles.page}>
            <div className={styles.container}>
                <nav aria-label="Các bước đặt hàng" className={styles.steps}>
                    <Link href="/gio-hang/" aria-current="step">
                        01 / Giỏ hàng
                    </Link>
                    <a href={ZALO_URL} target="_blank" rel="noopener noreferrer">02 / Liên hệ Zalo</a>
                </nav>
                <h1 className={styles.heading}>
                    Giỏ hàng<span className="ml-4 align-top font-sans text-base tracking-normal">({cart.count})</span>
                </h1>
                <p role="status" aria-atomic="true" className="sr-only">{status}</p>
                <noscript>
                    <p className={styles.summaryNote}>
                        Giỏ hàng được lưu trên thiết bị của bạn và cần JavaScript để hoạt động. Bạn vẫn có thể <Link href="/san-pham/" className={styles.textLink}>xem sản phẩm</Link> hoặc <Link href="/lien-he/" className={styles.textLink}>liên hệ cửa hàng để đặt hàng</Link>.
                    </p>
                </noscript>
                {!cart.ready ? (
                    <p role="status">Đang tải giỏ hàng…</p>
                ) : !cart.items.length ? (
                    <div ref={emptyRef} className={styles.empty}>
                        <p>Giỏ hàng của bạn đang trống. Chọn một hương vị cà phê cho ngày mới.</p>
                        <Button href="/san-pham/">Xem sản phẩm</Button>
                    </div>
                ) : (
                    <div className={styles.layout}>
                        <div>
                            <ul className={styles.items}>
                                {cart.lines.map(({ product, quantity, lineTotal }, index) => (
                                    <li key={product.slug} id={`cart-item-${product.slug}`} className={styles.item}>
                                        {index === 0 && <RevealLine className="text-[color:var(--line)]" />}
                                        <RevealLine side="bottom" className="text-[color:var(--line)]" />
                                        <Link href={`/san-pham/${product.slug}/`} className={styles.itemImage} tabIndex={-1} aria-hidden="true">
                                            <Image src={product.image} alt="" width={120} height={140} style={{ objectFit: "contain" }} />
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
                                                    onChange={(next) => {
                                                        cart.update(product.slug, next);
                                                        setStatus(`${product.name}: ${next} gói.`);
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    className={styles.remove}
                                                    aria-label={`Xóa ${product.name}`}
                                                    onClick={() => {
                                                        focusAfterRemove.current = (cart.lines[index + 1] ?? cart.lines[index - 1])?.product.slug ?? "";
                                                        cart.remove(product.slug);
                                                        setStatus(`Đã xóa ${product.name} khỏi giỏ.`);
                                                    }}
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
                                Tiếp tục mua sắm <LinkMarker />
                            </Link>
                        </div>
                        <aside className={styles.summary} aria-label="Tổng giỏ hàng">
                            <h2>Đơn hàng của bạn</h2>
                            <dl>
                                <div className={styles.summaryRow}>
                                    <RevealLine side="bottom" className="text-foreground/15" />
                                    <dt>Tạm tính</dt>
                                    <dd>{formatPrice(cart.subtotal)}</dd>
                                </div>
                                <div className={styles.summaryRow}>
                                    <RevealLine side="bottom" className="text-foreground/15" />
                                    <dt>Giao hàng</dt>
                                    <dd>{cart.subtotal >= FREE_SHIPPING_THRESHOLD ? "Miễn phí" : "Xác nhận khi đặt hàng"}</dd>
                                </div>
                                <div className={`${styles.summaryRow} ${styles.total}`}>
                                    <RevealLine side="bottom" className="text-foreground/15" />
                                    <dt>Tổng tiền hàng</dt>
                                    <dd>{formatPrice(cart.subtotal)}</dd>
                                </div>
                            </dl>
                            <Button href={ZALO_URL} target="_blank" rel="noopener noreferrer" fullWidth>
                                Liên hệ Zalo <LinkMarker />
                            </Button>
                            <p className={styles.summaryNote}>
                                {cart.subtotal >= FREE_SHIPPING_THRESHOLD
                                    ? "Đơn hàng của bạn được miễn phí giao hàng."
                                    : `Mua thêm ${formatPrice(FREE_SHIPPING_THRESHOLD - cart.subtotal)} để được miễn phí giao hàng.`}
                            </p>
                            <p className={styles.summaryNote}>Zalo: {ZALO_PHONE}. Gửi sản phẩm và số lượng để được hỗ trợ.</p>
                        </aside>
                    </div>
                )}
            </div>
        </article>
    );
}
