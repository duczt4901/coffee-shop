"use client";
import { storyImages as images } from "@/data/page-images";

import { storyContent as content } from "@/data/page-content";

import { useLayoutEffect, useRef, type ReactElement } from "react";
import { SkeletonImage as Image } from "@/components/ui/SkeletonImage";
import { observeMotion, observeScroll } from "@/lib/native-motion";
import { getScrollViewportHeight } from "@/lib/scroll-viewport";
import { FeaturedProductsSection } from "@/components/sections/home-page";
import { EditorialReveal } from "@/components/ui/EditorialReveal";
import styles from "./page.module.css";

export default function StoryPage(): ReactElement {
    const rootRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        return observeMotion("(min-width: 1001px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)", () => {
            const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-story-card]"));
            const stack = cards[0].parentElement!;
            const stop = observeScroll(() => {
                const viewport = getScrollViewportHeight();
                const top = stack.getBoundingClientRect().top;
                let nextTop = cards[0].offsetHeight;
                cards.slice(1, -1).forEach((card, index) => {
                    nextTop += card.offsetHeight;
                    const progress = Math.max(0, Math.min(1, 1 - (top + nextTop) / viewport));
                    card.style.transform = `scale(${1 - progress * 0.25}) rotate(${progress * (index % 2 === 0 ? 5 : -5)}deg)`;
                    card.style.setProperty("--after-opacity", String(progress));
                });
            });
            return () => {
                stop();
                cards.forEach((card) => {
                    card.style.removeProperty("transform");
                    card.style.removeProperty("--after-opacity");
                });
            };
        });
    }, []);

    return (
        <div ref={rootRef} className={styles.storyRoot} data-story-page>
            <div className={styles.cardStack}>
                <section data-story-card className={`${styles.card} ${styles.introCard}`}>
                    <CardIndex>00</CardIndex>
                    <div className={`${styles.container} px-page`}>
                        <p className={styles.eyebrow}>{content.story_eyebrow_1}</p>
                        <EditorialReveal>
                            <div data-story-intro className={styles.introTitle}>
                                <p data-reveal="block" className={styles.chapter}>
                                    {content.story_chapter_1}
                                </p>
                                <h1 data-reveal="words">
                                    {content.story_h1_1} <em>{content.story_em_1}</em>
                                    <br /> {content.story_h1_2}
                                </h1>
                                <p data-reveal="lines" className={styles.lede}>
                                    {content.story_lede_1}
                                </p>
                            </div>
                        </EditorialReveal>
                        <div className={`${styles.visual} ${styles.introVisual}`}>
                            <StoryImage src={images.story_image_lam_dong_coffee_farm} alt="Vùng trồng cà phê trên cao nguyên" />
                        </div>
                        <p className={styles.coordinates}>{content.story_coordinates_1}</p>
                    </div>
                </section>

                <section data-story-card className={`${styles.card} ${styles.originCard}`}>
                    <CardIndex>01</CardIndex>
                    <div className={`${styles.container} ${styles.originLayout} px-page`}>
                        <div className={`${styles.visual} ${styles.portraitVisual}`}>
                            <StoryImage src={images.story_image_lam_dong_coffee_farm_panorama} alt="Vườn cà phê Lâm Đồng" />
                        </div>
                        <EditorialReveal>
                            <div className={styles.copy}>
                                <p data-reveal="block" className={styles.eyebrow}>
                                    {content.story_eyebrow_2}
                                </p>
                                <h2 data-reveal="words">
                                    {content.story_h2_1} <em>{content.story_em_2}</em>
                                </h2>
                                <p data-reveal="lines" className={styles.lede}>
                                    {content.story_lede_2}
                                </p>
                                <p data-reveal="lines">{content.story_p_1}</p>
                            </div>
                        </EditorialReveal>
                        <p className={styles.fact}>
                            <strong>{content.story_strong_1}</strong>
                            <span>{content.story_span_1}</span>
                        </p>
                    </div>
                </section>

                <section data-story-card className={`${styles.card} ${styles.harvestCard}`}>
                    <CardIndex>02</CardIndex>
                    <div className={`${styles.container} ${styles.harvestLayout} px-page`}>
                        <EditorialReveal>
                            <div className={styles.copy}>
                                <p data-reveal="block" className={styles.eyebrow}>
                                    {content.story_eyebrow_3}
                                </p>
                                <h2 data-reveal="words">
                                    {content.story_h2_2} <em>{content.story_em_3}</em>
                                </h2>
                                <p data-reveal="lines" className={styles.lede}>
                                    {content.story_lede_3}
                                </p>
                                <p data-reveal="lines">{content.story_p_2}</p>
                            </div>
                        </EditorialReveal>
                        <div className={`${styles.visual} ${styles.harvestVisual}`}>
                            <StoryImage src={images.story_image_coffee_harvest_bucket} alt="Người thu hái những quả cà phê chín" />
                        </div>
                        <div className={`${styles.visual} ${styles.harvestInset}`}>
                            <StoryImage src={images.story_image_ripe_coffee_cherries} alt="Quả cà phê chín đỏ trên cành" />
                        </div>
                        <p className={styles.fact}>
                            <strong>{content.story_strong_2}</strong>
                            <span>{content.story_span_2}</span>
                        </p>
                    </div>
                </section>

                <section data-story-card className={`${styles.card} ${styles.processingCard}`}>
                    <CardIndex>03</CardIndex>
                    <div className={`${styles.container} ${styles.processingLayout} px-page`}>
                        <EditorialReveal>
                            <div className={styles.processingHeading}>
                                <p data-reveal="block" className={styles.eyebrow}>
                                    {content.story_eyebrow_4}
                                </p>
                                <h2 data-reveal="words">
                                    {content.story_h2_3} <em>{content.story_em_4}</em>
                                </h2>
                            </div>
                        </EditorialReveal>
                        <div className={`${styles.visual} ${styles.processingVisual}`}>
                            <StoryImage src={images.story_image_coffee_drying_beds_aerial} alt="Những mẻ cà phê được phơi thành từng luống" />
                        </div>
                        <div className={`${styles.visual} ${styles.processingInset}`}>
                            <StoryImage src={images.story_image_coffee_drying_raking} alt="Cà phê đang được đảo đều khi phơi" />
                        </div>
                        <EditorialReveal>
                            <div className={styles.processingCopy}>
                                <p data-reveal="lines">{content.story_p_3}</p>
                                <p data-reveal="lines">{content.story_p_4}</p>
                            </div>
                        </EditorialReveal>
                        <p className={styles.processList}>{content.story_processlist_1}</p>
                    </div>
                </section>

                <section data-story-card className={`${styles.card} ${styles.roastingCard}`}>
                    <CardIndex>04</CardIndex>
                    <div className={`${styles.container} ${styles.roastLayout} px-page`}>
                        <EditorialReveal>
                            <div className={styles.roastHeading}>
                                <p data-reveal="block" className={styles.eyebrow}>
                                    {content.story_eyebrow_5}
                                </p>
                                <h2 data-reveal="words">
                                    {content.story_h2_4} <em>{content.story_em_5}</em> {content.story_h2_5}
                                </h2>
                            </div>
                        </EditorialReveal>
                        <div className={`${styles.visual} ${styles.roastVisual}`}>
                            <StoryImage src={images.story_image_coffee_roast_levels} alt="Các cấp độ rang của hạt cà phê" />
                        </div>
                        <EditorialReveal>
                            <div className={styles.roastCopy}>
                                <p data-reveal="lines" className={styles.lede}>
                                    {content.story_lede_4}
                                </p>
                                <p data-reveal="lines">{content.story_p_5}</p>
                            </div>
                        </EditorialReveal>
                        <p className={styles.roastNote}>{content.story_roastnote_1}</p>
                    </div>
                </section>

                <section data-story-card className={`${styles.card} ${styles.brewingCard}`}>
                    <CardIndex>05</CardIndex>
                    <div className={`${styles.container} ${styles.brewingLayout} px-page`}>
                        <EditorialReveal>
                            <div className={styles.brewingCopy}>
                                <p data-reveal="block" className={styles.eyebrow}>
                                    {content.story_eyebrow_6}
                                </p>
                                <h2 data-reveal="words">
                                    {content.story_h2_6} <em>{content.story_em_6}</em>
                                </h2>
                                <p data-reveal="lines" className={styles.lede}>
                                    {content.story_lede_5}
                                </p>
                            </div>
                        </EditorialReveal>
                        <div className={`${styles.visual} ${styles.brewingVisual}`}>
                            <StoryImage src={images.story_image_coffee_drinks_assortment} alt="Những tách cà phê đã hoàn thiện" />
                        </div>
                        <p className={styles.brewingNote}>{content.story_brewingnote_1}</p>
                    </div>
                </section>
            </div>
            <div className="bg-background text-foreground">
                <FeaturedProductsSection />
            </div>
        </div>
    );
}

function CardIndex({ children }: { children: string }): ReactElement {
    return (
        <span className={styles.cardIndex} aria-hidden="true">
            {children}
        </span>
    );
}

function StoryImage({ src, alt }: { src: string; alt: string }): ReactElement {
    return (
        <div className={styles.image}>
            <Image src={src} alt={alt} fill sizes="(max-width: 1000px) 100vw, 60vw" />
        </div>
    );
}
