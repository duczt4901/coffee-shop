"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { SkeletonImage as Image } from "@/components/ui/SkeletonImage";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/commerce";
import { Quantity } from "./Quantity";
import { useCart } from "./useCart";
import styles from "./Commerce.module.css";

export function CartItems({ disabled = false }: { disabled?: boolean }) {
    const cart = useCart();
    const root = useRef<HTMLDivElement>(null);
    const focusAfterRemove = useRef<string | null>(null);
    const [status, setStatus] = useState("");
    useLayoutEffect(() => {
        const slug = focusAfterRemove.current;
        if (slug === null) return;
        focusAfterRemove.current = null;
        const target = slug ? root.current?.querySelector<HTMLElement>(`[data-cart-item="${slug}"] button:not(:disabled)`) : root.current?.querySelector<HTMLElement>("a");
        target?.focus();
    }, [cart.lines]);
    return (
        <div ref={root} data-cart-items>
            <p role="status" aria-atomic="true" className="sr-only">{status}</p>
            {!cart.ready ? <p role="status">Đang tải giỏ hàng…</p> : !cart.lines.length ? (
                <div className={styles.empty}>
                    <p>Giỏ hàng của bạn đang trống. Chọn một hương vị cà phê cho ngày mới.</p>
                    <Button href="/san-pham/">Xem sản phẩm</Button>
                </div>
            ) : (
                <ul className={styles.items}>
                    {cart.lines.map(({ product, quantity, lineTotal }, index) => (
                        <li key={product.slug} data-cart-item={product.slug} className={styles.item}>
                            <Link href={`/san-pham/${product.slug}/`} className={styles.itemImage} tabIndex={-1} aria-hidden="true">
                                <Image src={product.image} alt="" width={120} height={140} style={{ objectFit: "contain" }} />
                            </Link>
                            <div>
                                <Link href={`/san-pham/${product.slug}/`} className={styles.itemTitle}>{product.name}</Link>
                                <p className={styles.muted}>{product.sizeLabel} · {formatPrice(product.priceVnd)} / gói</p>
                                <fieldset disabled={disabled} className={styles.itemActions}>
                                    <legend className="sr-only">Điều chỉnh {product.name}</legend>
                                    <Quantity label={`Số lượng ${product.name}`} value={quantity} onChange={next => {
                                        cart.update(product.slug, next);
                                        setStatus(`${product.name}: ${next} gói.`);
                                    }} />
                                    <button type="button" className={styles.remove} aria-label={`Xóa ${product.name}`} onClick={() => {
                                        focusAfterRemove.current = (cart.lines[index + 1] ?? cart.lines[index - 1])?.slug ?? "";
                                        cart.remove(product.slug);
                                        setStatus(`Đã xóa ${product.name} khỏi giỏ.`);
                                    }}>Xóa</button>
                                </fieldset>
                            </div>
                            <span className={styles.itemPrice}>{formatPrice(lineTotal)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
