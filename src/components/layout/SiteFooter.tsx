"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { ContactForm } from "@/components/ui/ContactForm";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";
import styles from "./SiteFooter.module.css";
import { RevealLink } from "@/components/ui/EditorialReveal";

gsap.registerPlugin(ScrollTrigger);

export function SiteFooter() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLElement>(null);
    const pathname = usePathname();
    const { started } = useExperienceRuntime();

    useLenis(() => ScrollTrigger.update());

    useGSAP(
        () => {
            if (!started) return;

            const motion = gsap.matchMedia();
            motion.add("(min-width: 64rem) and (min-height: 38rem) and (prefers-reduced-motion: no-preference)", () => {
                gsap.fromTo(
                    footerRef.current,
                    { yPercent: -50 },
                    {
                        yPercent: 0,
                        ease: "none",
                        scrollTrigger: {
                            trigger: wrapperRef.current,
                            start: "top bottom",
                            // Finish before a tall footer's first content scrolls above the viewport.
                            end: "top top",
                            scrub: true,
                            invalidateOnRefresh: true,
                        },
                    },
                );
            });

            return () => motion.revert();
        },
        { scope: wrapperRef, dependencies: [pathname, started], revertOnUpdate: true },
    );

    return (
        <div ref={wrapperRef} data-footer-reveal className={`${styles.revealBoundary} relative overflow-clip bg-[#ede8dd]`}>
            <footer
                ref={footerRef}
                data-site-footer
                className="relative flex flex-col justify-between gap-12 border-t-2 border-foreground/10 bg-[#ede8dd] px-page pt-24 pb-12 text-foreground md:gap-16 md:pt-12"
            >
                <div className="flex flex-col items-start justify-between gap-12 md:flex-row md:gap-10">
                    <ContactForm />

                    <nav aria-label="Kết nối với Lá Vườn" className="flex w-full min-w-0 flex-col gap-6 text-sm text-foreground md:w-60 md:shrink-0">
                        <RevealLink href="#" variant="border">
                            Zalo · 0123 456 789
                        </RevealLink>
                        <RevealLink href="#" variant="border" delay={0.1}>
                            Facebook · ABC
                        </RevealLink>
                        <RevealLink href="#" variant="border" delay={0.2}>
                            Email · mail@email.com
                        </RevealLink>
                    </nav>
                </div>

                <span className="pointer-events-none block whitespace-nowrap font-cormorant text-[clamp(3rem,20vw,24rem)] leading-[0.8] uppercase tracking-[0.04em]">la vuon</span>

                <div className="flex flex-col gap-8 text-sm text-foreground/60 md:flex-row md:flex-wrap md:items-end md:justify-between">
                    <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-3 md:gap-x-10">
                        <RevealLink href="/ve-chung-toi/" variant="border">
                            Về chúng tôi
                        </RevealLink>
                        <RevealLink href="/san-pham/" variant="border" delay={0.1}>
                            Tất cả sản phẩm
                        </RevealLink>
                        <RevealLink href="/faq/" variant="border" delay={0.2}>
                            Câu hỏi thường gặp
                        </RevealLink>
                        <RevealLink href="/lien-he/" variant="border" delay={0.3}>
                            Liên hệ
                        </RevealLink>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-10">
                        <span>All Rights Reserved</span>
                        <a href="#" className="border-b border-current hover:text-neutral-900">
                            Credits
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
