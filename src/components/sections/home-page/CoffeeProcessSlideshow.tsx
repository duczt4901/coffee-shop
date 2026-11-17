"use client";

import { type ReactElement } from "react";
import { SkeletonImage } from "@/components/ui/SkeletonImage";
import styles from "./CoffeeProcessSlideshow.module.css";

import { coffeeStories as stories } from "@/data/coffee-stories";

export function CoffeeProcessSlideshow(): ReactElement {
    return (
        <div className={styles.slideshow} role="group" aria-label="Câu chuyện cà phê Lâm Đồng">
            <div className={styles.frame}>
                <div className={styles.viewport} role="region" aria-label="Ảnh câu chuyện cà phê, cuộn ngang để xem" tabIndex={0}>
                    <div className={styles.slideTrack}>
                        {stories.map((story) => (
                            <article className={styles.slide} key={story.title} aria-label={story.title}>
                                <div className={styles.media}>
                                    <SkeletonImage className={styles.image} src={story.image} alt={`${story.title} cà phê Lâm Đồng`} fill sizes="100vw" loading="eager" />

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
