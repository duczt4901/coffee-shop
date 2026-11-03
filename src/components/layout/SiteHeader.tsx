"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScribbleText } from "@/components/ui/ScribbleText";
import { database } from "@/lib/database";
import { cn } from "@/lib/utils";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";
import styles from "./SiteHeader.module.css";
import { CartLink } from "@/components/commerce/CartLink";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";

const COLOR_TRIGGER_VH = 0.9;
const LOGO_TRIGGER_VH = 2.5;
const LOGO_SCROLL_END_VH = 1;
const HEADER_HIDE_START_PX = 80;

export function SiteHeader(): React.ReactElement {
    const header = database.header;
    const pathname = usePathname();
    const isHome = pathname === "/";
    const { started } = useExperienceRuntime();

    const [scrollState, setScrollState] = useState({ triggered: !isHome, isAtTop: true, logoTriggered: false, logoHidden: false });
    const scrollStateRef = useRef(scrollState);
    const { triggered, isAtTop, logoTriggered, logoHidden } = scrollState;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const logoRef = useRef<HTMLAnchorElement>(null);
    const lastScrollYRef = useRef(0);

    useLayoutEffect(() => {
        let frame = 0;
        let viewportHeight = 1;
        let heroTop = 0;
        let headerScale = 1;
        let logoReady = !isHome;
        let readyFrame = 0;

        // Keep the server-rendered logo small; measure the hero size before paint.
        logoRef.current?.classList.toggle(styles.homeLogo, isHome);
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
            const progress = !isHome || mobileMenuOpen || !logoReady ? 1 : Math.min(Math.max(scrollY / (viewportHeight * LOGO_SCROLL_END_VH), 0), 1);
            if (logo) logo.style.transform = `translate3d(-50%, ${heroTop * (1 - progress)}px, 0) scale(${1 + (headerScale - 1) * progress})`;
            frame = 0;
        };

        const handleScroll = () => {
            if (!frame) frame = requestAnimationFrame(updateHeader);
        };

        const measure = () => {
            const logo = logoRef.current;
            if (!logo) return;
            viewportHeight = getScrollViewportHeight();
            const top = window.innerWidth < 768 ? 12 : 20;
            heroTop = viewportHeight * 0.5 - top - logo.offsetHeight * 0.5;
            headerScale = (window.innerWidth < 768 ? 52 : 72) / Math.max(logo.offsetWidth, 1);
            cancelAnimationFrame(frame);
            updateHeader();
        };
        measure();

        // pageshow precedes native scroll restoration; read the restored position next frame.
        const settleLogo = () => {
            cancelAnimationFrame(readyFrame);
            readyFrame = requestAnimationFrame(() => {
                logoReady = true;
                updateHeader();
            });
        };
        if (document.readyState === "complete") settleLogo();
        window.addEventListener("pageshow", settleLogo);
        window.addEventListener("scroll", handleScroll, {
            passive: true,
        });
        window.addEventListener("resize", measure);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", measure);
            window.removeEventListener("pageshow", settleLogo);
            cancelAnimationFrame(frame);
            cancelAnimationFrame(readyFrame);
        };
    }, [isHome, mobileMenuOpen]);

    useEffect(() => {
        if (!mobileMenuOpen) return;

        const previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";

        return () => {
            document.documentElement.style.overflow = previousOverflow;
        };
    }, [mobileMenuOpen]);

    return (
        <nav
            data-site-header
            aria-label="Điều hướng chính"
            className={cn("pointer-events-none fixed inset-0 z-11 transition-colors duration-300", mobileMenuOpen || triggered ? "text-foreground" : "text-background")}
        >
            <div
                className={cn(
                    styles.row,
                    "relative flex w-full items-center px-page py-5 transition-opacity duration-300",
                    !mobileMenuOpen && logoTriggered && logoHidden ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100",
                )}
            >
                <button type="button" className={styles.menuToggle} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" onClick={() => setMobileMenuOpen((open) => !open)}>
                    {mobileMenuOpen ? "ĐÓNG" : "MENU"}
                </button>

                <div className={cn(styles.desktopLinks, "flex items-start gap-10 transition-opacity duration-150", isHome && (started ? "opacity-100 delay-500" : "opacity-0 delay-0"))}>
                    <ScribbleText.Root>
                        {header.headerItems.map((item: { ariaLabel: string; href: string }) => (
                            <ScribbleText.Item key={item.href} text={item.ariaLabel} href={item.href} />
                        ))}
                    </ScribbleText.Root>
                </div>

                <Link ref={logoRef} href={header.href} aria-label={header.ariaLabel} onClick={() => setMobileMenuOpen(false)} className={styles.logo}>
                    <Image src="/images/brand/logo-placeholder.jpg" alt="Lá Vườn Cà Phê" width={500} height={350} priority className="block h-auto w-full" />
                </Link>

                <div className={cn(styles.desktopActions, "flex flex-1 items-center justify-end transition-opacity duration-150", isHome && (started ? "opacity-100 delay-500" : "opacity-0 delay-0"))}>
                    <Link href="/faq/" className="mr-4 text-sm font-medium underline-offset-4 hover:underline" aria-current={pathname === "/faq/" ? "page" : undefined}>
                        FAQ
                    </Link>
                    <span className="flex items-center gap-2 p-3 text-sm font-normal uppercase tracking-wide">
                        <span>VI-VN</span>
                    </span>
                </div>
                <CartLink onClick={() => setMobileMenuOpen(false)} />
            </div>

            <div id="mobile-navigation" className={styles.mobilePanel} aria-hidden={!mobileMenuOpen}>
                <div className={styles.mobileLinks}>
                    {header.headerItems.map((item: { ariaLabel: string; href: string }) => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} tabIndex={mobileMenuOpen ? 0 : -1}>
                            {item.ariaLabel}
                        </Link>
                    ))}
                    <Link href="/faq/" onClick={() => setMobileMenuOpen(false)} tabIndex={mobileMenuOpen ? 0 : -1}>
                        FAQ
                    </Link>
                </div>
                <span className={styles.mobileLanguage}>VI — VN</span>
            </div>

            <div
                aria-hidden="true"
                className={cn(
                    "absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-150",
                    isHome && isAtTop && started ? "opacity-100 delay-500" : "opacity-0 delay-0",
                )}
            >
                <span className="h-2 w-2 rotate-45 border-b border-r border-current" />
            </div>
        </nav>
    );
}
