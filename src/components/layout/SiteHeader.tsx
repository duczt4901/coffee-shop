"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { lockScroll } from "@/lib/scroll-lock";
import { siteConfig as database } from "@/lib/site-config";
import { observeScroll } from "@/lib/native-motion";
import { CartLink } from "@/components/commerce/CartLink";
import { useEnhancedDisclosure } from "@/components/ui/useEnhancedDisclosure";
import { SiteMenu } from "./SiteMenu";
import styles from "./SiteHeader.module.css";

// The previous header and stylesheet are commented/archived in assets/archive/layout/.
export function SiteHeader() {
    const pathname = usePathname();
    const darkHero = pathname === "/" || /^\/ve-chung-toi\/?$/.test(pathname);
    const headerRef = useRef<HTMLElement>(null);
    const toggleRef = useRef<HTMLElement>(null);
    const { detailsRef, panelRef, enhanced, open, nativeOpen, setOpen } = useEnhancedDisclosure();
    const [position, setPosition] = useState({ overHero: darkHero || /^\/san-pham\/[^/]+\/?$/.test(pathname), scrolled: false, expanded: true });
    const links = [...database.header.headerItems, { href: "/faq/", ariaLabel: "FAQ" }];
    const close = () => {
        if (!enhanced && detailsRef.current) detailsRef.current.open = false;
        setOpen(false);
    };
    const menu = <SiteMenu ref={panelRef} enhanced={enhanced} open={open} pathname={pathname} links={links} onClose={close} />;

    useLayoutEffect(() => {
        const collapseAfter = parseFloat(getComputedStyle(document.documentElement).fontSize) * 4;
        return observeScroll(() => {
            const hero = document.querySelector("[data-hero], [data-header-hero]");
            const overHero = !!hero && hero.getBoundingClientRect().bottom > 0;
            const scrolled = window.scrollY > 0;
            const expanded = window.scrollY <= collapseAfter;
            setPosition((previous) => (previous.overHero === overHero && previous.scrolled === scrolled && previous.expanded === expanded ? previous : { overHero, scrolled, expanded }));
        });
    }, [pathname]);

    useEffect(() => {
        if (!nativeOpen) return;
        const header = headerRef.current;
        const panel = panelRef.current;
        if (!header || !panel) return;
        const background = Array.from(document.querySelectorAll<HTMLElement>("main, [data-site-footer], [role='scrollbar']"));
        const inert = background.map((element) => element.inert);
        let unlockScroll = () => {};
        let released = false;
        const onKey = (event: KeyboardEvent) => {
            if (document.querySelector("#cart-drawer:modal")) return;
            if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
            } else if (event.key === "Tab") {
                const controls = Array.from(panel.querySelectorAll<HTMLElement>("a[href], button")).filter(
                    (element) => element.tabIndex !== -1 && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden" && !element.hasAttribute("disabled"),
                );
                const first = controls[0],
                    last = controls.at(-1);
                if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };
        const release = () => {
            if (released) return;
            released = true;
            document.removeEventListener("keydown", onKey);
            background.forEach((element, index) => {
                element.inert = inert[index];
            });
            unlockScroll();
            toggleRef.current?.focus({ preventScroll: true });
        };
        try {
            unlockScroll = lockScroll();
            background.forEach((element) => {
                element.inert = true;
            });
            document.addEventListener("keydown", onKey);
        } catch {
            release();
            setOpen(false);
        }
        return release;
    }, [nativeOpen, setOpen, panelRef]);

    useEffect(() => {
        if (!open) return;
        const panel = panelRef.current;
        if (!panel) return;
        let cancelled = false;
        const focus = () => {
            if (cancelled) return;
            try {
                panel.querySelector<HTMLButtonElement>("[data-menu-close]")?.focus({ preventScroll: true });
            } catch {
                setOpen(false);
            }
        };
        void Promise.all(panel.getAnimations().map(animation => animation.finished)).then(focus, () => {});
        return () => { cancelled = true; };
    }, [open, panelRef, setOpen]);

    useEffect(() => {
        const closeOnHistory = () => setOpen(false);
        window.addEventListener("popstate", closeOnHistory);
        return () => window.removeEventListener("popstate", closeOnHistory);
    }, [setOpen]);

    return (
        <header
            ref={headerRef}
            data-site-header
            data-over-hero={position.overHero}
            data-light-logo={darkHero && position.overHero}
            data-scrolled={position.scrolled}
            data-expanded={position.expanded}
            data-menu-open={open}
            data-menu-enhanced={enhanced}
            className={styles.header}
        >
            <div className={styles.row}>
                <div className={styles.left}>
                    <details ref={detailsRef} open={nativeOpen || undefined} className={styles.menu}>
                        <summary
                            ref={toggleRef}
                            className={styles.toggle}
                            aria-label="Mở menu"
                            tabIndex={enhanced && nativeOpen ? -1 : undefined}
                            aria-expanded={enhanced ? open : undefined}
                            aria-controls="site-navigation"
                            onClick={(event) => {
                                if (!enhanced) return;
                                event.preventDefault();
                                setOpen(!open);
                            }}
                        >
                            <span className={styles.hamburger} aria-hidden="true">
                                <i />
                                <i />
                            </span>
                            <span className={styles.toggleLabel}>Menu</span>
                        </summary>
                        {!enhanced && menu}
                    </details>
                </div>
                <Link href="/" aria-label={database.site.name} className={styles.logo} inert={nativeOpen || undefined}>
                    <Image src="/images/brand/lavuon-wordmark.svg" alt={database.site.name} width={500} height={350} priority />
                </Link>
                <div className={styles.actions} inert={nativeOpen || undefined}>
                    <CartLink />
                </div>
            </div>
            {/* Keep the enhanced panel rendered so native details cannot skip its first transition. */}
            {enhanced && menu}
        </header>
    );
}
