"use client";

import { useEffect, useRef, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { revealLoadedImage } from "@/lib/image-load-reveal";

export function SkeletonHtml({ html, className }: { html: string; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        ref.current?.querySelectorAll("img").forEach((image) => {
            if (image.complete) image.dataset.imageReady = "true";
        });
    }, [html]);

    const finish = (event: SyntheticEvent<HTMLDivElement>) => {
        const image = event.target as HTMLImageElement;
        if (image.tagName !== "IMG" || image.dataset.imageReady) return;
        image.dataset.imageReady = "true";
        if (event.type === "load" && image.naturalWidth > 0) revealLoadedImage(image);
    };

    return (
        <div
            ref={ref}
            className={cn(className, "[&_img:not([data-image-ready])]:bg-foreground/10 motion-safe:[&_img:not([data-image-ready])]:animate-pulse")}
            onLoadCapture={finish}
            onErrorCapture={finish}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
