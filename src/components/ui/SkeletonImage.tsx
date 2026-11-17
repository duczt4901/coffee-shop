"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { revealLoadedImage } from "@/lib/image-load-reveal";
import imagePlaceholders from "@/data/image-placeholders.json";
import responsiveImages from "@/data/responsive-images.json";

export function SkeletonImage({ alt, className, onLoad, onError, placeholder, blurDataURL, ...props }: ImageProps) {
    const [settled, setSettled] = useState<{ src: ImageProps["src"]; failed: boolean } | null>(null);
    const finished = settled?.src === props.src;
    const preview = blurDataURL ?? (typeof props.src === "string" ? (imagePlaceholders as Record<string, string>)[props.src] : undefined);

    const image = (
        <Image
            {...props}
            alt={alt}
            placeholder={placeholder ?? (preview ? "blur" : "empty")}
            blurDataURL={preview}
            className={cn(className, !finished && !preview && "motion-safe:animate-pulse", (!finished || settled?.failed) && "bg-foreground/10")}
            onLoad={(event) => {
                setSettled({ src: props.src, failed: false });
                revealLoadedImage(event.currentTarget);
                onLoad?.(event);
            }}
            onError={(event) => {
                setSettled({ src: props.src, failed: true });
                onError?.(event);
            }}
        />
    );
    const srcSet = typeof props.src === "string" ? (responsiveImages as Record<string, string>)[props.src] : undefined;
    return srcSet ? <picture style={{ display: "contents" }}>
        <source style={{ display: "none" }} srcSet={srcSet} sizes={props.sizes ?? "(min-width: 768px) 25vw, 66vw"} />
        {image}
    </picture> : image;
}
