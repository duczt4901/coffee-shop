"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatPrice, FREE_SHIPPING_THRESHOLD } from "@/lib/commerce";
import { CartItems } from "./CartItems";
import { useCart } from "./useCart";
import styles from "./CartDrawer.module.css";

export function CartDrawer() {
    const drawerRef = useRef<HTMLDialogElement>(null);
    const pressedOutside = useRef(false);
    const pathname = usePathname();
    const cart = useCart();
    useEffect(() => {
        const drawer = drawerRef.current;
        return () => drawer?.close();
    }, [pathname]);
    const close = async () => {
        const drawer = drawerRef.current;
        if (!drawer?.open || drawer.dataset.closing) return;
        drawer.dataset.closing = "true";
        // Keep the native modal active until slide-out finishes, including Safari/Firefox.
        await Promise.allSettled(drawer.getAnimations().map(animation => animation.finished));
        if (!drawer.dataset.closing) return;
        drawer.close();
        delete drawer.dataset.closing;
    };
    const outside = (event: { clientX: number; clientY: number }, drawer: HTMLDialogElement) => {
        const bounds = drawer.getBoundingClientRect();
        return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    };
    return (
        <dialog ref={drawerRef} id="cart-drawer" className={styles.dialog} aria-labelledby="cart-drawer-title" closedby="any" data-lenis-prevent data-reveal-skip
            onCancel={event => { event.preventDefault(); void close(); }}
            onClose={event => { delete event.currentTarget.dataset.closing; }}
            onPointerDown={event => { pressedOutside.current = outside(event, event.currentTarget); }}
            onPointerUp={event => {
                if (!("closedBy" in HTMLDialogElement.prototype) && pressedOutside.current && outside(event, event.currentTarget)) void close();
                pressedOutside.current = false;
            }}>
            <div className={styles.header}>
                <h2 id="cart-drawer-title">Giỏ hàng <span>({cart.count})</span></h2>
                <button type="button" autoFocus className={styles.close} aria-label="Đóng giỏ hàng" onClick={() => void close()}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 4 12 12m0-12L4 16" stroke="currentColor" strokeWidth="1.2" /></svg>
                </button>
            </div>
            <div className={styles.body}><CartItems /></div>
            {cart.ready && cart.lines.length > 0 && (
                <div className={styles.summary}>
                    <p className={styles.subtotal}><span>Tạm tính</span><strong>{formatPrice(cart.subtotal)}</strong></p>
                    <p className={styles.note}>{cart.subtotal >= FREE_SHIPPING_THRESHOLD ? "Đơn hàng được miễn phí giao hàng." : `Thêm ${formatPrice(FREE_SHIPPING_THRESHOLD - cart.subtotal)} để được miễn phí giao hàng.`}</p>
                    <Button href="/thanh-toan/" fullWidth onClick={() => void close()}>Tiến hành thanh toán</Button>
                    <button type="button" className={styles.continue} onClick={() => void close()}>Tiếp tục mua sắm</button>
                </div>
            )}
        </dialog>
    );
}
