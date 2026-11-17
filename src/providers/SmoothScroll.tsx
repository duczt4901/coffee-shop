"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { getSmoothScroll } from "@/lib/smooth-scroll";

export default function SmoothScroll({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        let disposed = false;
        let loading = false;
        let create: typeof import("lenis").default | undefined;
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const start = () => {
            const root = document.documentElement;
            if (disposed || media.matches || root.dataset.initialReveal !== "done" || root.dataset.revealActive === "true" || root.style.overflow === "hidden" || getSmoothScroll()) return;
            if (!create) {
                if (!loading) {
                    loading = true;
                    void import("lenis").then(module => { create = module.default; start(); }).catch(error => {
                        console.error("Smooth scroll unavailable; keeping native scrolling.", error);
                    });
                }
                return;
            }
            const lenis = new create({ autoRaf: true, syncTouch: false, stopInertiaOnNavigate: true });
            window.__lavuonLenis = lenis;
            lenis.scrollTo(window.scrollY, { immediate: true });
        };
        const updateMotion = () => {
            if (media.matches) {
                getSmoothScroll()?.destroy();
                delete window.__lavuonLenis;
            } else start();
        };
        window.addEventListener("lavuon:reveal-done", start);
        const unlockObserver = new MutationObserver(start);
        unlockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
        media.addEventListener("change", updateMotion);
        start();
        return () => {
            disposed = true;
            window.removeEventListener("lavuon:reveal-done", start);
            unlockObserver.disconnect();
            media.removeEventListener("change", updateMotion);
            getSmoothScroll()?.destroy();
            delete window.__lavuonLenis;
        };
    }, []);

    useEffect(() => {
        const lenis = getSmoothScroll();
        lenis?.resize();
        lenis?.scrollTo(window.scrollY, { immediate: true });
    }, [pathname]);

    return children;
}
