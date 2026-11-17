"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "./useCart";
import { openCartDrawer } from "./cart-drawer";
import styles from "./Commerce.module.css";

export function CartLink({ onClick }: { onClick?: () => void }) {
    const { count, ready } = useCart();
    const badgeRef = useRef<HTMLSpanElement>(null);
    const previousCount = useRef<number | undefined>(undefined);
    useEffect(() => {
        const changed = ready && previousCount.current !== undefined && previousCount.current !== count;
        previousCount.current = ready ? count : undefined;
        if (!changed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const animation = badgeRef.current?.animate?.([
            { transform: "translate(-50%, -50%) scale(1)" },
            { transform: "translate(-50%, -50%) scale(1.2)", offset: 0.4 },
            { transform: "translate(-50%, -50%) scale(1)" },
        ], { duration: 240, easing: "ease-out" });
        return () => animation?.cancel();
    }, [count, ready]);
    return (
        <Link href="/thanh-toan/" data-transition-ignore onNavigate={openCartDrawer} onClick={onClick} aria-haspopup="dialog" aria-controls="cart-drawer" aria-label={`Giỏ hàng, ${count} sản phẩm`} className={styles.cartLink}>
            <span className={styles.cartIcon}>
                <svg width="23" height="25" viewBox="0 0 24 26" fill="none" aria-hidden="true">
                    <path d="M4 8h16l1 15H3L4 8Z" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M8 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                <span ref={badgeRef} className={styles.badge}>{count}</span>
            </span>
            <span>Giỏ hàng</span>
        </Link>
    );
}
