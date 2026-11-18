"use client";
import { homeImages as images } from "@/data/page-images";


import { useEffect, useRef } from "react";

export function HeroVideo(): React.ReactElement {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        const hero = video?.closest("[data-hero]");
        if (!video || !hero) return;

        let inView = false;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const reveal = document.querySelector<HTMLElement>("[data-page-reveal]");
        const updatePlayback = () => {
            const pageReady = !reveal || reveal.hidden || reveal.dataset.revealState !== "waiting";
            if (pageReady && inView && !document.hidden && !reducedMotion.matches) {
                if (!video.getAttribute("src")) video.src = "/videos/coffee/coffee-cherry-sorting-hero.mp4";
                void video.play().catch(() => {
                    /* Autoplay can be blocked by browser preferences. */
                });
            } else {
                video.pause();
            }
        };

        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            updatePlayback();
        });
        observer.observe(hero);
        const revealObserver = new MutationObserver(updatePlayback);
        if (reveal) revealObserver.observe(reveal, { attributes: true, attributeFilter: ["data-reveal-state", "hidden"] });
        document.addEventListener("visibilitychange", updatePlayback);
        reducedMotion.addEventListener("change", updatePlayback);

        return () => {
            observer.disconnect();
            revealObserver.disconnect();
            document.removeEventListener("visibilitychange", updatePlayback);
            reducedMotion.removeEventListener("change", updatePlayback);
            video.pause();
        };
    }, []);

    return (
        <div className="h-full w-full overflow-hidden bg-black">
            <video ref={videoRef} data-hero-video muted loop playsInline preload="none" poster={images.home_image_coffee_cherry_sorting_hero_poster} aria-hidden="true" className="h-full w-full scale-[1.02] object-cover brightness-[0.55]" />
        </div>
    );
}
