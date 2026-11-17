"use client";

import type { CSSProperties, Ref } from "react";
import Link from "next/link";
import { ZALO_PHONE, ZALO_URL } from "@/data/contact";
import { openCartDrawer } from "@/components/commerce/cart-drawer";
import styles from "./SiteMenu.module.css";

const MENU_UNDERLINES = [
    { viewBox: "5 0 111 28", path: "M5 18 C54 3 55 2 44 12 C38 17 69 13 86 5 C101 1 76 16 116 9" },
    { viewBox: "6 0 108 24", path: "M6 14 C10 8 14 8 18 14 C22 20 26 20 30 14 C34 8 38 8 42 14 C46 20 50 20 54 14 C58 8 62 8 66 14 C70 20 74 20 78 14 C82 8 86 8 90 14 C94 20 98 20 102 14 C106 8 110 8 114 14" },
    { viewBox: "6 0 108 28", path: "M6 16 C28 11 46 10 60 11 C68 12 74 13 79 14 C74 14 69 16 66 18 C64 20 65 22 69 23 C74 24 80 22 82 18 C83 15 79 13 74 13 C84 13 98 13 114 14" },
    { viewBox: "6 0 103 24", path: "M6 14 C12 10 32 8 24 14 C16 20 36 18 42 14 C49 10 68 2 109 4" },
];

type SiteMenuProps = {
    ref: Ref<HTMLDivElement>;
    enhanced: boolean;
    open: boolean;
    pathname: string;
    links: { href: string; ariaLabel: string }[];
    onClose: () => void;
};

export function SiteMenu({ ref, enhanced, open, pathname, links, onClose }: SiteMenuProps) {
    return (
        <div ref={ref} id="site-navigation" className={styles.panel} data-enhanced={enhanced} aria-hidden={enhanced ? !open : undefined} role={enhanced && open ? "dialog" : undefined} aria-modal={enhanced && open ? true : undefined} aria-label="Điều hướng Là Vườn Coffee">
            <button type="button" className={styles.backdrop} aria-label="Đóng menu" tabIndex={-1} onClick={onClose} />
            <div className={styles.drawer} data-lenis-prevent>
                <button type="button" data-menu-close className={styles.closeButton} aria-label="Đóng menu" onClick={onClose}>
                    <svg className={styles.closeIcon} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="m4 4 12 12" stroke="currentColor" strokeWidth="1.2" />
                        <path d="m16 4-12 12" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                </button>
                <div className={styles.menuPrimary}>
                    <p className={styles.menuLabel}>Menu</p>
                    <nav className={styles.menuLinks} aria-label="Điều hướng chính">
                        {links.map((link, index) => {
                            const underline = MENU_UNDERLINES[index % MENU_UNDERLINES.length];
                            return (
                                <div key={link.href} className={styles.menuItem} style={{ "--menu-order": index } as CSSProperties}>
                                    <Link href={link.href} className={styles.navLink} onClick={onClose} aria-current={pathname === link.href ? "page" : undefined} tabIndex={enhanced && !open ? -1 : undefined}>
                                        <span>{link.ariaLabel}</span>
                                        <svg className={styles.underline} viewBox={underline.viewBox} preserveAspectRatio="none" aria-hidden="true" focusable="false">
                                            <path d={underline.path} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        </svg>
                                    </Link>
                                </div>
                            );
                        })}
                    </nav>
                </div>
                <div className={styles.menuSecondary}>
                    <nav aria-label="Khám phá Là Vườn">
                        <p className={styles.menuLabel}>Khám phá</p>
                        <Link href="/san-pham/" onClick={onClose}>Tất cả sản phẩm</Link>
                        <Link href="/thanh-toan/" data-transition-ignore onClick={onClose} onNavigate={openCartDrawer} aria-haspopup="dialog" aria-controls="cart-drawer">Giỏ hàng</Link>
                        <Link href="/faq/" onClick={onClose}>Câu hỏi thường gặp</Link>
                    </nav>
                    <nav aria-label="Liên hệ Là Vườn">
                        <p className={styles.menuLabel}>Liên hệ</p>
                        <a href={`tel:${ZALO_PHONE}`} onClick={onClose}>{ZALO_PHONE}</a>
                        <Link href="/lien-he/" onClick={onClose}>Gửi lời nhắn</Link>
                    </nav>
                </div>
                <div className={styles.menuContact}>
                    <a href={ZALO_URL} onClick={onClose}>Liên hệ Zalo ↗</a>
                </div>
            </div>
        </div>
    );
}
