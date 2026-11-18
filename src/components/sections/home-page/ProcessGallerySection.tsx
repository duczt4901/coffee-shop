import { homeImages as images } from "@/data/page-images";
import { homeContent as content } from "@/data/page-content";
import type { ReactElement } from "react";
import { SkeletonImage as Image } from "@/components/ui/SkeletonImage";
import { ImageReveal } from "@/components/ui/ImageReveal";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import styles from "./ProcessGallerySection.module.css";

export function ProcessGallerySection(): ReactElement {
    return (
        <section className="relative z-1 bg-background px-page py-2.5 md:pb-0 font-cormorant" aria-labelledby="process-gallery-title">
            <EditorialReveal>
                <header className="flex flex-col items-center justify-center px-3 py-section-large text-center md:px-6">
                    <p data-reveal="block" className="mb-8  text-[clamp(0.8rem,1vw,1rem)] italic">
                        {content.process_p_1}
                    </p>
                    <h2
                        data-reveal="words"
                        id="process-gallery-title"
                        className="text-[clamp(2.75rem,14vw,3.75rem)] font-medium uppercase leading-none tracking-[-0.06em] md:text-[clamp(3.75rem,8.5vw,10rem)]"
                    >
                        {content.process_h2_1} <em className="font-normal lowercase"> {content.process_em_1}</em>
                        <br /> <em className="font-normal lowercase">{content.process_em_2}</em>
                    </h2>
                </header>
            </EditorialReveal>

            <div data-process-gallery className={styles.gallery}>
                <div data-process-feature className={styles.feature}>
                    <ImageReveal>
                        <Image src={images.home_image_coffee_parchment_drying} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-center" />
                    </ImageReveal>
                </div>

                <div className={styles.details}>
                    <div className={styles.imagePair}>
                        <div className={styles.image}>
                            <ImageReveal parallax={80}>
                                <Image src={images.home_image_coffee_harvest_bucket} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                            </ImageReveal>
                        </div>
                        <div className={styles.image}>
                            <ImageReveal parallax={60}>
                                <Image src={images.home_image_raised_coffee_drying_beds} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                            </ImageReveal>
                        </div>
                    </div>

                    <div className={styles.narrative}>
                        <div className={styles.copy}>
                            <EditorialReveal>
                                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                                    <p data-reveal="block" className="text-[clamp(0.8rem,1vw,1rem)] italic">
                                        {content.process_p_2}
                                    </p>

                                    <h3 data-reveal="words" className="text-[clamp(2rem,2.4vw,3rem)] font-medium leading-[1.05] tracking-[-0.04em]">
                                        {content.process_h3_1}
                                        <br /> {content.process_h3_2}
                                    </h3>

                                    <p data-reveal="lines" className="max-w-lg text-[clamp(1rem,1.2vw,1.2rem)] leading-tight">
                                        {content.process_p_3}
                                    </p>
                                </div>
                            </EditorialReveal>

                            <div className="flex flex-1 flex-col items-center justify-center gap-10">
                                <div className={styles.sample}>
                                    <ImageReveal parallax={60}>
                                        <Image src={images.home_image_coffee_processing_stages} alt="" fill sizes="(min-width: 768px) 20rem, 70vw" className="object-cover object-center" />
                                    </ImageReveal>
                                </div>

                                <RevealLink href="/cau-chuyen/">
                                    {content.process_reveallink_1} <em>{content.process_em_3}</em>
                                </RevealLink>
                            </div>
                        </div>

                        <div className={styles.imagePair}>
                            <div className={styles.image}>
                                <ImageReveal parallax={80}>
                                    <Image src={images.home_image_coffee_beans_winnowing} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                                </ImageReveal>
                            </div>

                            <div className={styles.image}>
                                <ImageReveal parallax={60}>
                                    <Image src={images.home_image_coffee_drying_raking} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                                </ImageReveal>
                            </div>
                        </div>
                    </div>

                    <EditorialReveal>
                        <figure className="flex flex-col items-center justify-center px-[clamp(1.5rem,8vw,8rem)] py-section-large text-center">
                            <blockquote data-reveal="lines" className="max-w-180 text-[clamp(1.75rem,2.7vw,3rem)] font-medium leading-[1.08] tracking-[-0.04em]">
                                {content.process_blockquote_1}
                            </blockquote>
                            <figcaption data-reveal="block" className="mt-10 flex flex-col  text-[0.95rem] uppercase">
                                {content.process_figcaption_1}
                                <span className="mt-[0.2rem] italic normal-case">{content.process_span_1}</span>
                            </figcaption>
                        </figure>
                    </EditorialReveal>
                </div>
            </div>
        </section>
    );
}
