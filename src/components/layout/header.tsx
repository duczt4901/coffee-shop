"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScribbleText } from "@/components/ui/ScribbleText";
import { database } from "@/lib/database";
import { cn } from "@/lib/utils";
import Copy from "@/components/ui/TextReveal";
import { ChevronDownIcon } from "@/components/ui/Chevron";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";

const COLOR_TRIGGER_VH = 0.9;
const LOGO_TRIGGER_VH = 2.5;
const LOGO_SCROLL_END_VH = 1;
const HEADER_HIDE_START_PX = 80;

export function NavBar(): React.ReactElement {
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
        logoRef.current?.classList.toggle("site-header__logo--home", isHome);
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
            viewportHeight = window.innerHeight;
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
            aria-label="Điều hướng chính"
            className={cn("site-header pointer-events-none fixed inset-x-0 top-0 z-11 h-dvh transition-colors duration-300", mobileMenuOpen || triggered ? "text-foreground" : "text-background")}
        >
            <div
                className={cn(
                    "site-header__row relative flex w-full items-center px-page py-5 transition-opacity duration-300",
                    !mobileMenuOpen && logoTriggered && logoHidden ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100",
                )}
            >
                <button type="button" className="site-header__menu-toggle" aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" onClick={() => setMobileMenuOpen((open) => !open)}>
                    {mobileMenuOpen ? "ĐÓNG" : "MENU"}
                </button>

                <Copy delay={0.5}>
                    <div className={cn("site-header__links flex items-start gap-10 transition-opacity duration-150", isHome && (started ? "opacity-100 delay-500" : "opacity-0 delay-0"))}>
                        <ScribbleText.Root>
                            {header.headerItems.map((item: { ariaLabel: string; href: string }) => (
                                <ScribbleText.Item key={item.href} text={item.ariaLabel} href={item.href} />
                            ))}
                        </ScribbleText.Root>
                    </div>
                </Copy>

                <Link ref={logoRef} href={header.href} aria-label={header.ariaLabel} onClick={() => setMobileMenuOpen(false)} className="site-header__logo">
                    <Image src="/images/logo-placeholder.jpg" alt="Lá Vườn Cà Phê" width={500} height={350} priority className="block h-auto w-full" />
                </Link>

                <Copy delay={0.5}>
                    <div
                        className={cn(
                            "site-header__language flex flex-1 items-center justify-end transition-opacity duration-150",
                            isHome && (started ? "opacity-100 delay-500" : "opacity-0 delay-0"),
                        )}
                    >
                        <button className={cn("flex items-center gap-2 p-3", "text-sm font-medium uppercase tracking-wide transition")}>
                            <span>VI-VN</span>
                            <ChevronDownIcon open={false} strokeWidth={1.5} />
                        </button>
                    </div>
                </Copy>

                <Link className="site-header__mobile-cta" href="/san-pham/" onClick={() => setMobileMenuOpen(false)}>
                    SẢN PHẨM
                </Link>
            </div>

            <div id="mobile-navigation" className={cn("site-header__mobile-panel", mobileMenuOpen && "is-open")} aria-hidden={!mobileMenuOpen}>
                <div className="site-header__mobile-links">
                    {header.headerItems.map((item: { ariaLabel: string; href: string }) => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} tabIndex={mobileMenuOpen ? 0 : -1}>
                            {item.ariaLabel}
                        </Link>
                    ))}
                </div>
                <span className="site-header__mobile-language">VI — VN</span>
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
