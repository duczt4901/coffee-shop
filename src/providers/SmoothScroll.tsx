"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export default function SmoothScroll({ children }: { children: ReactNode }) {
    const ref = useRef<LenisRef>(null);
    const pathname = usePathname();

    useEffect(() => {
        const lenis = ref.current?.lenis;
        if (!lenis) return;
        // Let Next own restoration; discard inertia left over from the previous route.
        lenis.resize();
        lenis.scrollTo(window.scrollY, { immediate: true });
    }, [pathname]);

    return (
        <ReactLenis root ref={ref} options={{ autoRaf: true, syncTouch: false, stopInertiaOnNavigate: true }}>
            {children}
        </ReactLenis>
    );
}
