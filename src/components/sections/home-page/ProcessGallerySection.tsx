import type { ReactElement } from "react";
import Image from "next/image";
import { ImageReveal } from "@/components/ui/ImageReveal";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import styles from "./ProcessGallerySection.module.css";

export function ProcessGallerySection(): ReactElement {
    return (
        <section className="relative z-1 bg-background px-page py-2.5 md:pb-0 font-cormorant" aria-labelledby="process-gallery-title">
            <EditorialReveal start="center 85%">
                <header className="flex flex-col items-center justify-center px-3 py-section-large text-center md:px-6">
                    <p data-reveal="block" className="mb-8  text-[clamp(0.8rem,1vw,1rem)] italic">
                        Chi chi chành chành
                    </p>
                    <h2
                        data-reveal="words"
                        data-reveal-at="0.15"
                        id="process-gallery-title"
                        className="text-[clamp(2.75rem,14vw,3.75rem)] font-medium uppercase leading-none tracking-[-0.06em] md:text-[clamp(3.75rem,8.5vw,10rem)]"
                    >
                        cái đanh <em className="font-normal lowercase"> thổi lửa</em>
                        <br /> <em className="font-normal lowercase">con ngựa chết trương</em>
                    </h2>
                </header>
            </EditorialReveal>

            <div data-process-gallery className={styles.gallery}>
                <div data-process-feature className={styles.feature}>
                    <ImageReveal>
                        <Image src="/images/coffee/coffee-parchment-drying.webp" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-center" />
                    </ImageReveal>
                </div>

                <div className={styles.details}>
                    <div className={styles.imagePair}>
                        <div className={styles.image}>
                            <ImageReveal parallax={80}>
                                <Image src="/images/coffee/coffee-harvest-bucket.webp" alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                            </ImageReveal>
                        </div>
                        <div className={styles.image}>
                            <ImageReveal parallax={60}>
                                <Image src="/images/coffee/raised-coffee-drying-beds.webp" alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                            </ImageReveal>
                        </div>
                    </div>

                    <div className={styles.narrative}>
                        <div className={styles.copy}>
                            <EditorialReveal>
                                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                                    <p data-reveal="block" className="text-[clamp(0.8rem,1vw,1rem)] italic">
                                        Rồng rắn lên mây
                                    </p>

                                    <h3 data-reveal="words" data-reveal-at="0.15" className="text-[clamp(2rem,2.4vw,3rem)] font-medium leading-[1.05] tracking-[-0.04em]">
                                        Có cây lúc lắc,
                                        <br /> có nhà hiển binh.
                                    </h3>

                                    <p data-reveal="lines" data-reveal-at="0.35" className="max-w-lg text-[clamp(1rem,1.2vw,1.2rem)] leading-tight">
                                        Chú voi con ở Bản Đôn chưa có ngà nên còn trẻ con từ rừng già chú đến với người vẫn ham ăn với lại ham chơi. Voi con ơi voi con ơi mau lớn nhanh có đôi ngà to
                                        có sức đi khắp miền rừng xa kéo gỗ cho buôn làng của ta chú voi con thật là khôn quen thiếu nhi khắp vùng Bản Đôn. Đầu gật gù đưa vẫy cái vòi khéo đung đưa theo
                                        nhịp chiêng vui
                                    </p>
                                </div>
                            </EditorialReveal>

                            <div className="flex flex-1 flex-col items-center justify-center gap-10">
                                <div className={styles.sample}>
                                    <ImageReveal parallax={60}>
                                        <Image src="/images/coffee/coffee-processing-stages.webp" alt="" fill sizes="(min-width: 768px) 20rem, 70vw" className="object-cover object-center" />
                                    </ImageReveal>
                                </div>

                                <RevealLink href="/cau-chuyen/">
                                    Xem thêm <em>quy trình chế biến</em>
                                </RevealLink>
                            </div>
                        </div>

                        <div className={styles.imagePair}>
                            <div className={styles.image}>
                                <ImageReveal parallax={80}>
                                    <Image src="/images/coffee/coffee-beans-winnowing.webp" alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                                </ImageReveal>
                            </div>

                            <div className={styles.image}>
                                <ImageReveal parallax={60}>
                                    <Image src="/images/coffee/coffee-drying-raking.webp" alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                                </ImageReveal>
                            </div>
                        </div>
                    </div>

                    <EditorialReveal start="center 85%">
                        <figure className="flex flex-col items-center justify-center px-[clamp(1.5rem,8vw,8rem)] py-section-large text-center">
                            <blockquote data-reveal="lines" className="max-w-180 text-[clamp(1.75rem,2.7vw,3rem)] font-medium leading-[1.08] tracking-[-0.04em]">
                                “Một con vịt xoè ra hai cái cánh, nó kêu rằng cáp cáp cáp cạp cạp cạp. Gặp hồ nước nó bì bà bì bõm, lúc lên bờ vẫy cái cánh cho khô”
                            </blockquote>
                            <figcaption data-reveal="block" data-reveal-at="0.3" className="mt-10 flex flex-col  text-[0.95rem] uppercase">
                                TRUNG TOÀN
                                <span className="mt-[0.2rem] italic normal-case">SOMETHING Coffee CEO</span>
                            </figcaption>
                        </figure>
                    </EditorialReveal>
                </div>
            </div>
        </section>
    );
}
