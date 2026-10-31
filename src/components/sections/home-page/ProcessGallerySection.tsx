import type { ReactElement } from "react";
import Image from "next/image";
import { ImageReveal } from "@/components/ui/ImageReveal";
import styles from "./ProcessGallerySection.module.css";

export function ProcessGallerySection(): ReactElement {
    return (
        <section className="relative z-1 bg-background px-page py-2.5 md:pb-0 font-cormorant" aria-labelledby="process-gallery-title">
            <header className="flex min-h-[72svh] flex-col items-center justify-center px-3 py-24 text-center md:min-h-[92svh] md:px-6">
                <p className="mb-8  text-[clamp(0.8rem,1vw,1rem)] italic">Chi chi chành chành</p>
                <h2 id="process-gallery-title" className="text-[clamp(2.75rem,14vw,3.75rem)] font-medium uppercase leading-none tracking-[-0.06em] md:text-[clamp(3.75rem,8.5vw,10rem)]">
                    cái đanh <em className="font-normal lowercase"> thổi lửa</em>
                    <br />
                    <em className="font-normal lowercase">con ngựa chết trương</em>
                </h2>
            </header>

            <div className={styles.gallery}>
                <div className={styles.feature}>
                    <ImageReveal>
                        <Image src="/sections/img_2.png" alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-center" />
                    </ImageReveal>
                </div>

                <div className={styles.details}>
                    <div className={styles.imagePair}>
                        <div className={styles.image}>
                            <ImageReveal parallax={80}>
                                <Image src="/sections/img.png" alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                            </ImageReveal>
                        </div>
                        <div className={styles.image}>
                            <ImageReveal parallax={60}>
                                <Image src="/sections/img_4.png" alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                            </ImageReveal>
                        </div>
                    </div>

                    <div className={styles.narrative}>
                        <div className={styles.copy}>
                            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                                <p className="text-[clamp(0.8rem,1vw,1rem)] italic">Rồng rắn lên mây</p>

                                <h3 className="text-[clamp(2rem,2.4vw,3rem)] font-medium leading-[1.05] tracking-[-0.04em]">
                                    Có cây lúc lắc,
                                    <br />
                                    có nhà hiển binh.
                                </h3>

                                <p className="max-w-lg text-[clamp(1rem,1.2vw,1.2rem)] leading-tight">
                                    Chú voi con ở Bản Đôn chưa có ngà nên còn trẻ con từ rừng già chú đến với người vẫn ham ăn với lại ham chơi. Voi con ơi voi con ơi mau lớn nhanh có đôi ngà to có
                                    sức đi khắp miền rừng xa kéo gỗ cho buôn làng của ta chú voi con thật là khôn quen thiếu nhi khắp vùng Bản Đôn. Đầu gật gù đưa vẫy cái vòi khéo đung đưa theo nhịp
                                    chiêng vui
                                </p>
                            </div>

                            <div className="flex flex-1 flex-col items-center justify-center gap-10">
                                <div className={styles.sample}>
                                    <ImageReveal parallax={60}>
                                        <Image src="/sections/coffee3.jpeg" alt="" fill sizes="(min-width: 768px) 20rem, 70vw" className="object-cover object-center" />
                                    </ImageReveal>
                                </div>

                                <p className="bg-white px-12 py-[0.9rem] text-[clamp(0.9rem,1.15vw,1.1rem)]">
                                    xem thêm
                                    <em className="font-normal uppercase"> quy trình chế biến</em>
                                </p>
                            </div>
                        </div>

                        <div className={styles.imagePair}>
                            <div className={styles.image}>
                                <ImageReveal parallax={80}>
                                    <Image src="/sections/img_5.png" alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                                </ImageReveal>
                            </div>

                            <div className={styles.image}>
                                <ImageReveal parallax={60}>
                                    <Image src="/sections/img_3.png" alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover object-center" />
                                </ImageReveal>
                            </div>
                        </div>
                    </div>

                    <figure className="flex min-h-[72svh] flex-col items-center justify-center px-[clamp(1.5rem,8vw,8rem)] py-24 text-center">
                        <blockquote className="max-w-180 text-[clamp(1.75rem,2.7vw,3rem)] font-medium leading-[1.08] tracking-[-0.04em]">
                            “Một con vịt xoè ra hai cái cánh, nó kêu rằng cáp cáp cáp cạp cạp cạp. Gặp hồ nước nó bì bà bì bõm, lúc lên bờ vẫy cái cánh cho khô”
                        </blockquote>
                        <figcaption className="mt-10 flex flex-col  text-[0.95rem] uppercase">
                            TRUNG TOÀN
                            <span className="mt-[0.2rem] italic normal-case">SOMETHING Coffee CEO</span>
                        </figcaption>
                    </figure>
                </div>
            </div>
        </section>
    );
}
