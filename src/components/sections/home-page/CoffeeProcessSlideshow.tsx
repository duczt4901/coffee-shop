"use client";

import { type ReactElement } from "react";
import styles from "./CoffeeProcessSlideshow.module.css";

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
    return (
        <div className={styles.slideshow} role="group" aria-label="Câu chuyện cà phê Lâm Đồng">
            <div className={styles.frame}>
                <div className={styles.viewport} role="region" aria-label="Ảnh câu chuyện cà phê, cuộn ngang để xem" tabIndex={0}>
                    <div className={styles.slideTrack}>
                        {stories.map((story) => (
                            <article className={styles.slide} key={story.title} aria-label={story.title}>
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

/** Render the owner's progress; the native horizontal layout is available without enhancement. */
export function setupCoffeeProcessSlideshow(section: HTMLElement) {
    const photo = section.querySelector<HTMLElement>(`.${styles.slideshow}`);
    const slides = photo?.querySelector<HTMLElement>(`.${styles.slideTrack}`);
    const slider = photo?.querySelector<HTMLElement>(`.${styles.viewport}`);
    if (!photo || !slides || !slider) throw new Error("Coffee story markup is incomplete");

    const slideItems = Array.from(slides.querySelectorAll<HTMLElement>(`.${styles.slide}`));
    const images = Array.from(slides.querySelectorAll<HTMLImageElement>(`.${styles.image}`));
    const title = photo.querySelector<HTMLElement>(`.${styles.title}`);
    const titleTrack = title?.querySelector<HTMLElement>("h2");
    const titleItems = Array.from(photo.querySelectorAll<HTMLElement>(`.${styles.titleItem}`));

    if (!title || !titleTrack || slideItems.length !== stories.length || images.length !== slideItems.length || titleItems.length !== slideItems.length) throw new Error("Coffee story slides are incomplete");

    let currentVisibleIndex = -1;
    let lastProgress = -1;
    let lastWidth = 0;
    let lastVisible: boolean | undefined;
    let lastReducedMotion: boolean | undefined;
    slider.scrollLeft = 0;
    slider.tabIndex = -1;

    const showTitle = (activeIndex: number): void => {
        if (currentVisibleIndex === activeIndex) return;
        currentVisibleIndex = activeIndex;
        titleTrack.style.setProperty("--active", String(activeIndex));

        titleItems.forEach((item, index) => {
            item.style.opacity = index === activeIndex ? "1" : "0.28";
        });
    };

    return {
        update: ({ progress, width, visible, reducedMotion }: { progress: number; width: number; visible: boolean; reducedMotion: boolean }) => {
            if (progress === lastProgress && width === lastWidth && visible === lastVisible && reducedMotion === lastReducedMotion) return;
            lastProgress = progress;
            lastWidth = width;
            lastReducedMotion = reducedMotion;
            if (visible !== lastVisible) {
                lastVisible = visible;
                title.toggleAttribute("data-title-visible", visible);
                title.style.opacity = visible ? "1" : "0";
            }
            const horizontalProgress = Math.max(0, Math.min(1, (progress - edgeHold) / (1 - edgeHold * 2)));
            const totalProgress = horizontalProgress * (slideItems.length - 1);
            const currentSlide = Math.min(slideItems.length - 2, Math.floor(totalProgress));
            const sliderProgress = horizontalProgress === 1 ? 1 : totalProgress - currentSlide;

            slideItems.forEach((slide, index) => {
                let xPercent = 100;

                if (index <= currentSlide) {
                    xPercent = 0;
                } else if (index === currentSlide + 1) {
                    xPercent = (1 - sliderProgress) * 100;
                }

                slide.style.transform = `translateX(${xPercent}%)`;
            });

            images.forEach((image, index) => {
                let x = 0;
                if (!reducedMotion && index === currentSlide) {
                    x = -sliderProgress * width * 0.05;
                } else if (!reducedMotion && index === currentSlide + 1) {
                    x = (sliderProgress - 1) * width * 0.85;
                }
                image.style.transform = `translateX(${x}px) scale(${reducedMotion ? 1 : 1.2})`;
            });

            showTitle(Math.round(totalProgress));
        },

        cleanup: () => {
            slider.tabIndex = 0;
            title.removeAttribute("data-title-visible");
            title.style.removeProperty("opacity");
            titleTrack.style.removeProperty("--active");
            titleItems.forEach((item) => item.style.removeProperty("opacity"));
            slideItems.forEach((slide) => {
                slide.style.removeProperty("transform");
            });
            images.forEach((image) => image.style.removeProperty("transform"));
        },
    };
}
