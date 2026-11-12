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
                <div className={styles.viewport}>
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

/** Origin owns activation and rollback for both the map and its story. */
export function setupCoffeeProcessSlideshow(section: HTMLElement) {
    const photo = section.querySelector<HTMLElement>(`.${styles.slideshow}`);
    const slides = photo?.querySelector<HTMLElement>(`.${styles.slideTrack}`);
    const slider = photo?.querySelector<HTMLElement>(`.${styles.viewport}`);
    const storyStart = section.querySelector<HTMLElement>("[data-coffee-story-start]");

    if (!photo || !slides || !slider || !storyStart) throw new Error("Coffee story markup is incomplete");

    const slideItems = Array.from(slides.querySelectorAll<HTMLElement>(`.${styles.slide}`));
    const images = Array.from(slides.querySelectorAll<HTMLImageElement>(`.${styles.image}`));
    const title = photo.querySelector<HTMLElement>(`.${styles.title}`);
    const titleTrack = title?.querySelector<HTMLElement>("h2");
    const titleItems = Array.from(photo.querySelectorAll<HTMLElement>(`.${styles.titleItem}`));

    if (!title || !titleTrack || slideItems.length !== stories.length || images.length !== slideItems.length || titleItems.length !== slideItems.length) throw new Error("Coffee story slides are incomplete");

    let currentVisibleIndex = -1;

    const showTitle = (activeIndex: number): void => {
        if (currentVisibleIndex === activeIndex) return;
        currentVisibleIndex = activeIndex;
        titleTrack.style.setProperty("--active", String(activeIndex));

        titleItems.forEach((item, index) => {
            item.style.opacity = index === activeIndex ? "1" : "0.28";
        });
    };

    return {
        update: () => {
            const bounds = section.getBoundingClientRect();
            const distance = -bounds.top - storyStart.offsetTop;
            const range = bounds.height - photo.clientHeight - storyStart.offsetTop;
            const progress = Math.max(0, Math.min(1, distance / Math.max(1, range)));
            const visible = distance >= 0;
            title.toggleAttribute("data-title-visible", visible);
            title.style.opacity = visible ? "1" : "0";
            const slideWidth = slider.clientWidth;
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
                if (index === currentSlide) {
                    x = -sliderProgress * slideWidth * 0.05;
                } else if (index === currentSlide + 1) {
                    x = (sliderProgress - 1) * slideWidth * 0.85;
                }
                image.style.transform = `translateX(${x}px) scale(1.2)`;
            });

            showTitle(Math.round(totalProgress));
        },

        cleanup: () => {
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
