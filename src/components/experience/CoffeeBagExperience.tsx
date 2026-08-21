"use client";

import Script from "next/script";
import type { ReactElement } from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import Copy from "@/components/ui/TextReveal";
import CopyParagrath from "@/components/ui/ParagrathReveal";
import { FRONT_STICKY_TOP, SWITCH } from "./coffee-bag/constants";
import { useCopySwitch } from "./coffee-bag/useCopySwitch";
import { useSketchfabCamera } from "./coffee-bag/useSketchfabCamera";

export function CoffeeBagExperience(): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const backCopyRef = useRef<HTMLSpanElement>(null);
    const frontCopyRef = useRef<HTMLSpanElement>(null);

    useCopySwitch({
        containerRef,
        backCopyRef,
        frontCopyRef,
        switchProgress: SWITCH,
    });

    const initSketchfab = useSketchfabCamera({
        containerRef,
        iframeRef,
    });

    return (
        <div ref={containerRef} className="relative h-[300svh] w-full font-cormorant">
            <div className="relative h-[260svh] w-full pointer-events-none">
                <div className="sticky h-svh w-full overflow-hidden z-10 top-[30svh]">
                    <span ref={backCopyRef} className="pointer-events-none absolute inset-x-0 top-[10svh] z-10 w-full">
                        <Copy>
                            <h2 className="text-center text-[clamp(2.25rem,6vw,4rem)] uppercase">
                                người buồn cảnh có
                            </h2>
                        </Copy>
                    </span>
                </div>

                <iframe
                    ref={iframeRef}
                    title="Coffee bag"
                    className={cn(
                        "absolute inset-x-0 bottom-0 h-full w-full border-0 z-20",
                        "mask-[linear-gradient(to_bottom,black_0%,black_90%,transparent_100%)]",
                        "[webkit-mask-image:linear-gradient(to_bottom,black_0%,black_90%,transparent_100%)]"
                    )}
                    allow="autoplay; fullscreen;"
                    allowFullScreen
                />

                <div
                    className="sticky h-svh w-full overflow-hidden z-30"
                    style={{ top: `${FRONT_STICKY_TOP}svh` }}
                >
                    <span ref={frontCopyRef} className="pointer-events-none absolute inset-x-0 bottom-[5svh] z-30 w-full">
                        <Copy>
                            <h2 className="text-center text-[clamp(2.25rem,6vw,6rem)] uppercase">
                                vui đâu bao giờ.
                            </h2>
                        </Copy>
                    </span>
                </div>
            </div>

            <div className="flex items-start justify-center h-[40svh]">
                <div className="max-w-md">
                    <Copy outOnScroll>
                        <h2 className="text-xl font-semibold leading-tight sm:text-2xl">
                            Thân em vừa trắng lại vừa tròn, bảy nổi ba chìm với nước non.
                        </h2>
                    </Copy>

                    <CopyParagrath>
                        <p className="mt-6 text-justify text-base leading-7 text-foreground/70">
                            Lom khom dưới núi, tiều vài chú, lác đác bên sông, chợ mấy nhà. Nhớ nước đau lòng con quốc quốc, thương nhà mỏi miệng cái gia gia. Dừng chân đứng lại trời, non, nước, một mảnh tình riêng ta với ta.
                        </p>
                    </CopyParagrath>
                </div>
            </div>

            <Script
                src="https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js"
                strategy="afterInteractive"
                onReady={initSketchfab}
            />
        </div>
    );
}