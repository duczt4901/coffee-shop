"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScribbleText } from "@/components/ui/ScribbleText";
import { database } from "@/lib/database";
import { cn } from "@/lib/utils";
import styles from "./SiteHeader.module.css";
import { CartLink } from "@/components/commerce/CartLink";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import { useLenis } from "lenis/react";
import { useEnhancedDisclosure } from "@/components/ui/useEnhancedDisclosure";

const COLOR_TRIGGER_VH = 0.9;
const LOGO_TRIGGER_VH = 2.5;
const LOGO_SCROLL_END_VH = 1;
const HEADER_HIDE_START_PX = 80;

export function SiteHeader(): React.ReactElement {
    const header = database.header;
    const pathname = usePathname();
    const lenis = useLenis();
    const isHome = pathname === "/";

    const [scrollState, setScrollState] = useState({ triggered: !isHome, isAtTop: true, logoTriggered: false, logoHidden: false });
    const scrollStateRef = useRef(scrollState);
    const { triggered, isAtTop, logoTriggered, logoHidden } = scrollState;
    const { detailsRef: menuRef, panelRef: menuPanelRef, enhanced: menuEnhanced, open: mobileMenuOpen, nativeOpen: nativeMenuOpen, setOpen: setMobileMenuOpen, disable: disableMenu } = useEnhancedDisclosure();

    const headerRef = useRef<HTMLElement>(null);
    const logoRef = useRef<HTMLAnchorElement>(null);
    const lastScrollYRef = useRef(0);
    const closeMobileMenu = () => {
        if (!menuEnhanced && menuRef.current) menuRef.current.open = false;
        setMobileMenuOpen(false);
    };

    useLayoutEffect(() => {
        const header = headerRef.current;
        const logo = logoRef.current;
        if (!header || !logo) return;
        let frame = 0;
        let viewportHeight = 1;
        let heroTop = 0;
        let headerScale = 1;
        let readyFrame = 0;

        lastScrollYRef.current = window.scrollY;

        const updateHeader = () => {
            const logo = logoRef.current;
            const scrollY = window.scrollY;
            const nextTriggered = !isHome || scrollY > viewportHeight * COLOR_TRIGGER_VH;
            const nextLogoTriggered = scrollY > (isHome ? viewportHeight * LOGO_TRIGGER_VH : HEADER_HIDE_START_PX);
            const deltaY = scrollY - lastScrollYRef.current;
            const previous = scrollStateRef.current;
            const logoHidden = nextLogoTriggered && (deltaY > 1 || (deltaY >= -1 && previous.logoHidden));
            const next = { triggered: nextTriggered, isAtTop: scrollY <= 1, logoTriggered: nextLogoTriggered, logoHidden };
            if (next.triggered !== previous.triggered || next.isAtTop !== previous.isAtTop || next.logoTriggered !== previous.logoTriggered || next.logoHidden !== previous.logoHidden) {
                scrollStateRef.current = next;
                setScrollState(next);
            }
            lastScrollYRef.current = scrollY;
            const progress = !isHome || mobileMenuOpen ? 1 : Math.min(Math.max(scrollY / (viewportHeight * LOGO_SCROLL_END_VH), 0), 1);
            if (logo) logo.style.transform = `translate3d(-50%, ${heroTop * (1 - progress)}px, 0) scale(${1 + (headerScale - 1) * progress})`;
            frame = 0;
        };

        const handleScroll = () => {
            if (!frame) frame = requestAnimationFrame(updateHeader);
        };

        // pageshow precedes native scroll restoration; read the restored position next frame.
        const settleLogo = () => {
            cancelAnimationFrame(readyFrame);
            readyFrame = requestAnimationFrame(updateHeader);
        };
        const cleanup = () => {
            delete header.dataset.scrollReady;
            logo.style.removeProperty("transform");
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", measure);
            window.removeEventListener("pageshow", settleLogo);
            cancelAnimationFrame(frame);
            cancelAnimationFrame(readyFrame);
        };
        const measure = () => {
            try {
                viewportHeight = getScrollViewportHeight();
                const geometry = getComputedStyle(logo);
                const top = parseFloat(geometry.top);
                const width = parseFloat(geometry.getPropertyValue("--header-logo-width"));
                if (!Number.isFinite(top) || !Number.isFinite(width) || width <= 0 || logo.offsetWidth <= 0) throw new Error("Header geometry unavailable");
                heroTop = viewportHeight * 0.5 - top - logo.offsetHeight * 0.5;
                headerScale = width / logo.offsetWidth;
                cancelAnimationFrame(frame);
                updateHeader();
                return true;
            } catch {
                cleanup();
                return false;
            }
        };
        try {
            if (!measure()) return cleanup;
            window.addEventListener("pageshow", settleLogo);
            window.addEventListener("scroll", handleScroll, { passive: true });
            window.addEventListener("resize", measure);
            if (document.readyState === "complete") settleLogo();
            // A document-positioned baseline cannot flash a large fixed logo on a deep reload.
            header.dataset.scrollReady = "";
        } catch {
            cleanup();
        }
        return cleanup;
    }, [isHome, mobileMenuOpen]);

    useEffect(() => {
        if (!mobileMenuOpen) return;

        const root = document.documentElement;
        const previousOverflow = root.style.overflow;
        let desktop: MediaQueryList | undefined;
        let stoppedHere = false;
        let disposed = false;
        const closeOnDesktop = () => {
            if (desktop?.matches) setMobileMenuOpen(false);
        };
        const release = () => {
            root.style.overflow = previousOverflow;
            desktop?.removeEventListener?.("change", closeOnDesktop);
            if (stoppedHere) {
                stoppedHere = false;
                lenis?.start();
            }
        };
        try {
            desktop = window.matchMedia("(min-width: 48rem)");
            desktop.addEventListener("change", closeOnDesktop);
            if (desktop.matches) closeOnDesktop();
            else {
                if (lenis && !lenis.isStopped) {
                    stoppedHere = true;
                    lenis.stop();
                }
                root.style.overflow = "hidden";
            }
        } catch {
            release();
            queueMicrotask(() => {
                if (disposed) return;
                disableMenu();
            });
        }
        return () => {
            disposed = true;
            release();
        };
    }, [mobileMenuOpen, lenis, setMobileMenuOpen, disableMenu]);

    return (
        <nav
            ref={headerRef}
            data-site-header
            aria-label="Điều hướng chính"
            className={cn(styles.header, isHome && styles.homeHeader, "pointer-events-none inset-0 z-11 transition-colors duration-300", mobileMenuOpen || triggered ? "text-foreground" : "text-background")}
        >
            <div
                className={cn(
                    styles.row,
                    "relative flex w-full items-center px-page py-5 transition-opacity duration-300",
                    !mobileMenuOpen && logoTriggered && logoHidden ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100",
                )}
            >
                <span className={styles.menuSlot} aria-hidden="true" />

                <div className={cn(styles.desktopLinks, "flex items-start gap-10 transition-opacity duration-150", isHome && "opacity-100 delay-500")}>
                    <ScribbleText.Root>
                        {header.headerItems.map((item: { ariaLabel: string; href: string }) => (
                            <ScribbleText.Item key={item.href} text={item.ariaLabel} href={item.href} />
                        ))}
                    </ScribbleText.Root>
                </div>

                <Link ref={logoRef} href={header.href} aria-label={header.ariaLabel} onClick={closeMobileMenu} className={cn(styles.logo, isHome && styles.homeLogo)}>
                    <Image data-page-reveal-logo={isHome ? "" : undefined} src="/images/brand/logo-placeholder.jpg" alt="Lá Vườn Cà Phê" width={500} height={350} priority className="block h-auto w-full" />
                </Link>

                <div className={cn(styles.desktopActions, "flex flex-1 items-center justify-end transition-opacity duration-150", isHome && "opacity-100 delay-500")}>
                    <Link href="/faq/" className="mr-4 text-sm font-medium underline-offset-4 hover:underline" aria-current={pathname === "/faq/" ? "page" : undefined}>
                        FAQ
                    </Link>
                    <span className="flex items-center gap-2 p-3 text-sm font-normal uppercase tracking-wide">
                        <span>VI-VN</span>
                    </span>
                </div>
                <CartLink onClick={closeMobileMenu} />
            </div>

            <details ref={menuRef} className={cn(styles.mobileMenu, menuEnhanced && styles.menuEnhanced)} open={nativeMenuOpen || undefined}>
                <summary
                    className={styles.menuToggle}
                    data-hidden={menuEnhanced && !mobileMenuOpen && logoTriggered && logoHidden ? "true" : undefined}
                    aria-expanded={menuEnhanced ? mobileMenuOpen : undefined}
                    aria-controls="mobile-navigation"
                    onClick={(event) => {
                        if (!menuEnhanced) return;
                        event.preventDefault();
                        setMobileMenuOpen(!mobileMenuOpen);
                    }}
                >
                    {mobileMenuOpen ? "ĐÓNG" : "MENU"}
                </summary>
                <div ref={menuPanelRef} id="mobile-navigation" className={styles.mobilePanel} aria-hidden={menuEnhanced ? !mobileMenuOpen : undefined}>
                    <div className={styles.mobileLinks}>
                        {header.headerItems.map((item: { ariaLabel: string; href: string }) => (
                            <Link key={item.href} href={item.href} onClick={closeMobileMenu} tabIndex={menuEnhanced && !mobileMenuOpen ? -1 : undefined}>
                                {item.ariaLabel}
                            </Link>
                        ))}
                        <Link href="/faq/" onClick={closeMobileMenu} tabIndex={menuEnhanced && !mobileMenuOpen ? -1 : undefined}>
                            FAQ
                        </Link>
                    </div>
                    <span className={styles.mobileLanguage}>VI — VN</span>
                </div>
            </details>

            <div
                aria-hidden="true"
                className={cn(
                    "absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-150",
                    isHome && isAtTop ? "opacity-100 delay-500" : "opacity-0 delay-0",
                )}
            >
                <span className="h-2 w-2 rotate-45 border-b border-r border-current" />
            </div>
        </nav>
    );
}
