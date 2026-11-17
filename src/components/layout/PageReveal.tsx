"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { BrandMark } from "./BrandIntro";
import styles from "./PageReveal.module.css";

export function PageReveal({ initial, home, onReady }: { initial: boolean; home: boolean; onReady: () => void }) {
    const [firstLoad] = useState(initial);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        if (firstLoad && performance.now() >= 5000) document.documentElement.dataset.coffeeFallback = "true";
        let cleanup: (() => void) | undefined;
        let attached = false;
        const attach = () => {
            if (attached || !window.__lavuonReveal) return;
            attached = true;
            clearTimeout(deadline);
            cleanup = window.__lavuonReveal.attach(overlay, firstLoad, home, onReady);
        };
        const deadline = setTimeout(() => {
            overlay.hidden = true;
            document.documentElement.dataset.initialReveal = "done";
            onReady();
            window.dispatchEvent(new Event("lavuon:reveal-done"));
        }, 2000);
        window.addEventListener("lavuon:reveal-runtime", attach);
        attach();
        return () => {
            clearTimeout(deadline);
            window.removeEventListener("lavuon:reveal-runtime", attach);
            cleanup?.();
        };
    }, [firstLoad, home, onReady]);

    return (
        <>
            <div ref={overlayRef} data-page-reveal data-reveal-home={home} data-reveal-state="waiting" data-reveal-initial={firstLoad} aria-hidden="false" suppressHydrationWarning className={styles.reveal}>
                <div data-reveal-curtain className={styles.curtain} />
                <div data-reveal-brand hidden={!firstLoad} className={styles.brand}>
                    <BrandMark />
                    <span role="status" className="sr-only">Đang mở {siteConfig.site.name}…</span>
                </div>
                <span aria-hidden="true" className={styles.spinner} />
            </div>
            <noscript><style>{"[data-page-reveal]{display:none!important}html{scrollbar-width:auto!important;overflow:auto!important}"}</style></noscript>
        </>
    );
}
