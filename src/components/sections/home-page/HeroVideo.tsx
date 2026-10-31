"use client";

import { useEffect, useRef } from "react";

export function HomePageVideo(): React.ReactElement {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        const hero = video?.closest("[data-hero]");
        if (!video || !hero) return;

        let inView = false;
        const updatePlayback = () => {
            if (inView && !document.hidden) {
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
        document.addEventListener("visibilitychange", updatePlayback);

        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", updatePlayback);
            video.pause();
        };
    }, []);

    return (
        <div className="h-full w-full overflow-hidden bg-black">
            <video ref={videoRef} muted loop playsInline preload="metadata" aria-hidden="true" className="home-page-video h-full w-full scale-[1.02] object-cover blur-[2px] brightness-[0.55]">
                <source src="/images/lamdong/video-3.mp4" type="video/mp4" />
            </video>
        </div>
    );
}
