"use client";

import { useRef, type ReactElement } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./CoffeeProcessSlideshow.module.css";
import { useExperienceRuntime } from "@/components/experience/ExperienceRuntime";

gsap.registerPlugin(ScrollTrigger);

const stories = [
    {
        title: "Từ VƯỜN",
        image: "/images/coffee/lam-dong-coffee-farm-panorama.webp",
    },
    {
        title: "và THU HÁI",
        image: "/images/coffee/coffee-cherry-harvest.webp",
    },
    {
        title: "đến PHƠI SẤY",
        image: "/images/coffee/sun-dried-coffee-cherries.webp",
    },
];

const edgeHold = 0.08;

export function CoffeeProcessSlideshow(): ReactElement {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { started } = useExperienceRuntime();

    useGSAP(
        () => {
            if (!started) return;

            const photo = sectionRef.current;
            const section = photo?.closest<HTMLElement>("[data-coffee-origin]");
            const slides = photo?.querySelector<HTMLElement>(`.${styles.slideTrack}`);
            const slider = photo?.querySelector<HTMLElement>(`.${styles.viewport}`);
            const storyStart = section?.querySelector<HTMLElement>("[data-coffee-story-start]");

            if (!photo || !section || !slides || !slider || !storyStart) return;

            const slideItems = gsap.utils.toArray<HTMLElement>(`.${styles.slide}`, slides);
            const images = gsap.utils.toArray<HTMLImageElement>(`.${styles.image}`, slides);
            const title = photo.querySelector<HTMLElement>(`.${styles.title}`);
            const titleTrack = title?.querySelector<HTMLElement>("h2");
            const titleItems = gsap.utils.toArray<HTMLElement>(`.${styles.titleItem}`, photo);

            if (!title || !titleTrack || slideItems.length !== stories.length || images.length !== slideItems.length || titleItems.length !== slideItems.length) return;

            const motion = gsap.matchMedia();

            motion.add("(prefers-reduced-motion: no-preference)", () => {
                gsap.set(images, { x: 0, scale: 1.2 });
                gsap.set(title, { autoAlpha: 0 });
                gsap.set(titleItems, { opacity: 0.28 });
                titleTrack.style.setProperty("--active", "0");

                slideItems.forEach((slide, index) => {
                    gsap.set(slide, {
                        xPercent: index === 0 ? 0 : 100,
                        zIndex: index,
                    });
                });

                let slideWidth = slider.clientWidth;
                const setSlideX = slideItems.map((slide) => gsap.quickSetter(slide, "xPercent"));
                const setImageX = images.map((image) => gsap.quickSetter(image, "x", "px"));

                let currentVisibleIndex = -1;

                const showTitle = (activeIndex: number): void => {
                    if (currentVisibleIndex === activeIndex) return;
                    currentVisibleIndex = activeIndex;
                    titleTrack.style.setProperty("--active", String(activeIndex));

                    titleItems.forEach((item, index) => {
                        gsap.to(item, {
                            opacity: index === activeIndex ? 1 : 0.28,
                            duration: 0.5,
                            ease: "power2.out",
                            overwrite: true,
                        });
                    });
                };

                showTitle(0);

                const trigger = ScrollTrigger.create({
                    trigger: section,
                    start: () => `top+=${storyStart.offsetTop} top`,
                    end: "bottom bottom",
                    invalidateOnRefresh: true,
                    onRefreshInit: () => {
                        slideWidth = slider.clientWidth;
                    },
                    onEnter: () => {
                        showTitle(0);
                        title.setAttribute("data-title-visible", "");
                        gsap.to(title, {
                            autoAlpha: 1,
                            duration: 0.35,
                            overwrite: true,
                        });
                    },
                    onLeaveBack: () => {
                        title.removeAttribute("data-title-visible");
                        gsap.to(title, {
                            autoAlpha: 0,
                            duration: 0.2,
                            overwrite: true,
                        });
                    },
                    onUpdate: ({ progress }) => {
                        const horizontalProgress = gsap.utils.clamp(0, 1, (progress - edgeHold) / (1 - edgeHold * 2));
                        const totalProgress = horizontalProgress * (slideItems.length - 1);
                        const currentSlide = Math.min(slideItems.length - 2, Math.floor(totalProgress));
                        const sliderProgress = horizontalProgress === 1 ? 1 : totalProgress - currentSlide;

                        setSlideX.forEach((setX, index) => {
                            let xPercent = 100;

                            if (index <= currentSlide) {
                                xPercent = 0;
                            } else if (index === currentSlide + 1) {
                                xPercent = (1 - sliderProgress) * 100;
                            }

                            setX(xPercent);
                        });

                        setImageX.forEach((setX, index) => {
                            if (index === currentSlide) {
                                setX(-sliderProgress * slideWidth * 0.05);
                            } else if (index === currentSlide + 1) {
                                setX((sliderProgress - 1) * slideWidth * 0.85);
                            } else {
                                setX(0);
                            }
                        });

                        showTitle(Math.round(totalProgress));
                    },
                });

                return () => {
                    title.removeAttribute("data-title-visible");
                    trigger.kill();
                };
            });

            return () => motion.revert();
        },
        { scope: sectionRef, dependencies: [started] },
    );

    return (
        <div ref={sectionRef} className={styles.slideshow} role="group" aria-label="Câu chuyện cà phê Lâm Đồng">
            <div className={styles.frame}>
                <div className={styles.viewport}>
                    <div className={styles.slideTrack}>
                        {stories.map((story) => (
                            <article className={styles.slide} key={story.title}>
                                <div className={styles.media}>
                                    <img className={styles.image} src={story.image} alt={`${story.title} cà phê Lâm Đồng`} />

                                    <span className={styles.overlay} aria-hidden="true" />
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className={styles.title}>
                        <h2 className={styles.titleTrack}>
                            {stories.map((story, index) => (
                                <span className={styles.titleItem} key={story.title}>
                                    <span className={styles.titleText}>
                                        {story.title}
                                        {index < stories.length - 1 ? "," : "."}
                                    </span>
                                </span>
                            ))}
                        </h2>
                    </div>
                </div>
            </div>
        </div>
    );
}
