"use client";

import Link from "next/link";
import { useCart } from "./useCart";
import styles from "./Commerce.module.css";

export function CartLink({ onClick }: { onClick?: () => void }) {
    const { count } = useCart();
    return (
        <Link href="/gio-hang/" onClick={onClick} aria-label={`Giỏ hàng, ${count} sản phẩm`} className={styles.cartLink}>
            <svg width="23" height="25" viewBox="0 0 24 26" fill="none" aria-hidden="true">
                <path d="M4 8h16l1 15H3L4 8Z" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 9V6a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span className={styles.badge}>{count}</span>
        </Link>
    );
}
