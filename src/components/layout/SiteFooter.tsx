"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { observeMotion, observeScroll } from "@/lib/native-motion";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import { ContactForm } from "@/components/ui/ContactForm";
import { ZALO_PHONE, ZALO_URL } from "@/data/contact";
import styles from "./SiteFooter.module.css";
import { EditorialReveal, RevealLine, RevealLink } from "@/components/ui/EditorialReveal";

export function SiteFooter() {
    const debossId = useId();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLElement>(null);
    const pathname = usePathname();

    useLayoutEffect(() => {
        const wrapper = wrapperRef.current;
        const footer = footerRef.current;
        if (!wrapper || !footer) return;
        return observeMotion("(min-width: 64rem) and (min-height: 38rem)", () => {
            const stop = observeScroll(() => {
                const progress = Math.max(0, Math.min(1, 1 - wrapper.getBoundingClientRect().top / getScrollViewportHeight()));
                footer.style.transform = `translateY(${(progress - 1) * 50}%)`;
            });
            return () => {
                stop();
                footer.style.removeProperty("transform");
            };
        });
    }, [pathname]);

    return (
        <div ref={wrapperRef} data-footer-reveal className={`${styles.revealBoundary} relative overflow-clip bg-[#ede8dd]`}>
            <footer
                ref={footerRef}
                data-site-footer
                className={`${styles.footer} relative flex flex-col justify-between gap-12 border-t-2 border-transparent bg-[#ede8dd] px-page pt-24 pb-12 text-foreground md:gap-16 md:pt-12`}
            >
                <RevealLine thickness={2} className="text-foreground/10" />
                <div className="flex flex-col items-start justify-between gap-12 md:flex-row md:gap-10">
                    <ContactForm />

                    <nav aria-label="Kết nối với Là Vườn" className="flex w-full min-w-0 flex-col gap-6 text-sm text-foreground md:w-60 md:shrink-0">
                        <RevealLink href={ZALO_URL} variant="border">
                            Zalo · {ZALO_PHONE}
                        </RevealLink>
                        <RevealLink href="#" variant="border">
                            Facebook · ABC
                        </RevealLink>
                        <RevealLink href="#" variant="border">
                            Email · mail@email.com
                        </RevealLink>
                    </nav>
                </div>

                <EditorialReveal>
                    <svg data-reveal="block" data-reveal-title className={styles.pressedMark} viewBox="0 0 1200 240" role="img" aria-label="Là Vườn Coffee" focusable="false">
                        <defs>
                            <filter id={debossId} x="-2%" y="-6%" width="104%" height="112%" colorInterpolationFilters="sRGB">
                                <feOffset in="SourceAlpha" dy="1.2" result="down" />
                                <feGaussianBlur in="down" stdDeviation="0.65" result="downSoft" />
                                <feComposite in="SourceAlpha" in2="downSoft" operator="out" result="topEdge" />
                                <feFlood floodColor="#000" floodOpacity="0.22" result="shade" />
                                <feComposite in="shade" in2="topEdge" operator="in" result="innerShade" />
                                <feOffset in="SourceAlpha" dy="-0.65" result="up" />
                                <feGaussianBlur in="up" stdDeviation="0.35" result="upSoft" />
                                <feComposite in="SourceAlpha" in2="upSoft" operator="out" result="bottomEdge" />
                                <feFlood floodColor="#fff" floodOpacity="0.55" result="light" />
                                <feComposite in="light" in2="bottomEdge" operator="in" result="innerLight" />
                                <feOffset in="SourceAlpha" dy="0.6" result="lipDown" />
                                <feComposite in="lipDown" in2="SourceAlpha" operator="out" result="lipEdge" />
                                <feFlood floodColor="#fff" floodOpacity="0.9" result="lipLight" />
                                <feComposite in="lipLight" in2="lipEdge" operator="in" result="lip" />
                                <feMerge>
                                    <feMergeNode in="lip" />
                                    <feMergeNode in="SourceGraphic" />
                                    <feMergeNode in="innerShade" />
                                    <feMergeNode in="innerLight" />
                                </feMerge>
                            </filter>
                        </defs>
                        <text x="12" y="50%" dominantBaseline="central" textLength="1176" lengthAdjust="spacing" filter={`url(#${debossId})`}>
                            Là Vườn Coffee
                        </text>
                    </svg>
                </EditorialReveal>

                <div className="flex flex-col gap-8 text-sm text-foreground/60 md:flex-row md:flex-wrap md:items-end md:justify-between">
                    <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-3 md:gap-x-10">
                        <RevealLink href="/ve-chung-toi/" variant="border">
                            Về chúng tôi
                        </RevealLink>
                        <RevealLink href="/san-pham/" variant="border">
                            Tất cả sản phẩm
                        </RevealLink>
                        <RevealLink href="/faq/" variant="border">
                            Câu hỏi thường gặp
                        </RevealLink>
                        <RevealLink href="/lien-he/" variant="border">
                            Liên hệ
                        </RevealLink>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-10">
                        <EditorialReveal>
                            <span data-reveal="words">All Rights Reserved</span>
                        </EditorialReveal>
                        <EditorialReveal>
                            <a href="#" className="relative border-b border-transparent hover:text-neutral-900">
                                <RevealLine side="bottom" />
                                <span data-reveal="words">Credits</span>
                            </a>
                        </EditorialReveal>
                    </div>
                </div>
            </footer>
        </div>
    );
}
