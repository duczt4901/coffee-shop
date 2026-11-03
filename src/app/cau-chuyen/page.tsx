"use client";

import { useRef, type ReactElement } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { FeaturedProductsSection } from "@/components/sections/home-page";
import { EditorialReveal } from "@/components/ui/EditorialReveal";
import styles from "./page.module.css";

gsap.registerPlugin(ScrollTrigger);

export default function StoryPage(): ReactElement {
    const rootRef = useRef<HTMLDivElement>(null);

    useLenis(() => ScrollTrigger.update());

    useGSAP(
        () => {
            const root = rootRef.current;
            if (!root) return;

            const motion = gsap.matchMedia();

            motion.add("(min-width: 1001px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)", () => {
                const cards = Array.from(root.children)
                    .filter((element): element is HTMLElement => element instanceof HTMLElement && element.classList.contains(styles.card))
                    .slice(1);

                cards.forEach((card, index) => {
                    gsap.set(card, {
                        scale: 1,
                        rotation: 0,
                        "--after-opacity": 0,
                    });

                    if (index === cards.length - 1) return;

                    ScrollTrigger.create({
                        trigger: card,
                        start: "top top",
                        endTrigger: cards[cards.length - 1],
                        end: "top top",
                        pin: true,
                        pinSpacing: false,
                    });

                    gsap.to(card, {
                        scale: 0.75,
                        rotation: index % 2 === 0 ? 5 : -5,
                        "--after-opacity": 1,
                        ease: "none",
                        scrollTrigger: {
                            trigger: cards[index + 1],
                            start: "top bottom",
                            end: "top top",
                            scrub: true,
                        },
                    });
                });
            });

            return () => motion.revert();
        },
        { scope: rootRef },
    );

    return (
        <div ref={rootRef} className={styles.storyRoot} data-story-page>
            <section data-story-card className={`${styles.card} ${styles.introCard}`}>
                <CardIndex>00</CardIndex>
                <div className={`${styles.container} px-page`}>
                    <p className={styles.eyebrow}>Một hành trình của đất, người và thời gian</p>
                    <EditorialReveal>
                        <div data-story-intro className={styles.introTitle}>
                            <p data-reveal="block" className={styles.chapter}>
                                Câu chuyện cà phê · Lâm Đồng
                            </p>
                            <h1 data-reveal="words" data-reveal-at="0.15">
                                Từ <em>Cây</em>
                                <br /> Đến Tách
                            </h1>
                            <p data-reveal="lines" data-reveal-at="0.3" className={styles.lede}>
                                Không có tách cà phê nào bắt đầu ở quầy pha chế. Nó bắt đầu từ một mùa mưa, một hạt giống và những bàn tay biết chờ đợi.
                            </p>
                        </div>
                    </EditorialReveal>
                    <div className={`${styles.visual} ${styles.introVisual}`}>
                        <StoryImage src="/images/coffee/lam-dong-coffee-farm.webp" alt="Vùng trồng cà phê trên cao nguyên" />
                    </div>
                    <p className={styles.coordinates}>11.9404° N · 108.4583° E</p>
                </div>
            </section>

            <section data-story-card className={`${styles.card} ${styles.originCard}`}>
                <CardIndex>01</CardIndex>
                <div className={`${styles.container} ${styles.originLayout} px-page`}>
                    <div className={`${styles.visual} ${styles.portraitVisual}`}>
                        <StoryImage src="/images/coffee/lam-dong-coffee-farm-panorama.webp" alt="Vườn cà phê Lâm Đồng" />
                    </div>
                    <EditorialReveal>
                        <div className={styles.copy}>
                            <p data-reveal="block" className={styles.eyebrow}>
                                Chương I · Vùng trồng
                            </p>
                            <h2 data-reveal="words" data-reveal-at="0.15">
                                Gieo <em>Trồng</em>
                            </h2>
                            <p data-reveal="lines" data-reveal-at="0.3" className={styles.lede}>
                                Hương vị bắt đầu từ nơi cây bén rễ.
                            </p>
                            <p data-reveal="lines" data-reveal-at="0.4">
                                Câu chuyện bắt đầu từ một hạt nằm trong quả cà phê chín. Cây non được ươm dưới bóng râm, giữ ẩm rồi bén rễ vào đất khi mùa mưa đến. Phải đợi khoảng ba đến bốn năm cây
                                mới cho lứa quả đầu tiên; trong quãng chờ ấy, thổ nhưỡng, độ cao, mưa và nắng đã âm thầm viết nên hương vị của vùng trồng.
                            </p>
                        </div>
                    </EditorialReveal>
                    <p className={styles.fact}>
                        <strong>3–4</strong>
                        <span>năm cho lứa quả đầu tiên</span>
                    </p>
                </div>
            </section>

            <section data-story-card className={`${styles.card} ${styles.harvestCard}`}>
                <CardIndex>02</CardIndex>
                <div className={`${styles.container} ${styles.harvestLayout} px-page`}>
                    <EditorialReveal>
                        <div className={styles.copy}>
                            <p data-reveal="block" className={styles.eyebrow}>
                                Chương II · Mùa chín
                            </p>
                            <h2 data-reveal="words" data-reveal-at="0.15">
                                Thu <em>Hái</em>
                            </h2>
                            <p data-reveal="lines" data-reveal-at="0.3" className={styles.lede}>
                                Chỉ những quả vừa chín mới rời cành.
                            </p>
                            <p data-reveal="lines" data-reveal-at="0.4">
                                Khi quả chuyển sang đỏ thẫm, người hái trở lại từng hàng cây để chỉ chọn những quả vừa chín. Cách hái chọn lọc có thể lặp lại sau mỗi tám đến mười ngày: chậm hơn, tốn
                                công hơn, nhưng giúp mẻ cà phê đồng đều và giữ trọn phẩm chất mà cây đã tích lũy suốt một mùa.
                            </p>
                        </div>
                    </EditorialReveal>
                    <div className={`${styles.visual} ${styles.harvestVisual}`}>
                        <StoryImage src="/images/coffee/coffee-harvest-bucket.webp" alt="Người thu hái những quả cà phê chín" />
                    </div>
                    <div className={`${styles.visual} ${styles.harvestInset}`}>
                        <StoryImage src="/images/coffee/ripe-coffee-cherries.webp" alt="Quả cà phê chín đỏ trên cành" />
                    </div>
                    <p className={styles.fact}>
                        <strong>8–10</strong>
                        <span>ngày giữa mỗi lượt hái chọn</span>
                    </p>
                </div>
            </section>

            <section data-story-card className={`${styles.card} ${styles.processingCard}`}>
                <CardIndex>03</CardIndex>
                <div className={`${styles.container} ${styles.processingLayout} px-page`}>
                    <EditorialReveal>
                        <div className={styles.processingHeading}>
                            <p data-reveal="block" className={styles.eyebrow}>
                                Chương III · Chuyển hóa
                            </p>
                            <h2 data-reveal="words" data-reveal-at="0.15">
                                Sơ <em>Chế</em>
                            </h2>
                        </div>
                    </EditorialReveal>
                    <div className={`${styles.visual} ${styles.processingVisual}`}>
                        <StoryImage src="/images/coffee/coffee-drying-beds-aerial.webp" alt="Những mẻ cà phê được phơi thành từng luống" />
                    </div>
                    <div className={`${styles.visual} ${styles.processingInset}`}>
                        <StoryImage src="/images/coffee/coffee-drying-raking.webp" alt="Cà phê đang được đảo đều khi phơi" />
                    </div>
                    <EditorialReveal>
                        <div className={styles.processingCopy}>
                            <p data-reveal="lines">
                                Quả vừa hái phải được sơ chế sớm để không hư hỏng. Với phương pháp tự nhiên, quả được phơi nguyên vẹn; với phương pháp ướt, lớp vỏ và thịt quả được tách trước khi lên
                                men; còn phương pháp honey giữ lại một phần lớp nhầy ngọt quanh hạt.
                            </p>
                            <p data-reveal="lines">
                                Trên giàn phơi, hạt được đảo đều để khô chậm và ổn định. Chính lựa chọn sơ chế này quyết định cà phê sẽ trong trẻo, đậm vị trái cây hay ngọt dày trước cả khi hạt bước
                                vào máy rang.
                            </p>
                        </div>
                    </EditorialReveal>
                    <p className={styles.processList}>Tự nhiên · Ướt · Honey</p>
                </div>
            </section>

            <section data-story-card className={`${styles.card} ${styles.roastingCard}`}>
                <CardIndex>04</CardIndex>
                <div className={`${styles.container} ${styles.roastLayout} px-page`}>
                    <EditorialReveal>
                        <div className={styles.roastHeading}>
                            <p data-reveal="block" className={styles.eyebrow}>
                                Chương IV · Đánh thức
                            </p>
                            <h2 data-reveal="words" data-reveal-at="0.15">
                                Rang <em>&amp;</em> Pha
                            </h2>
                        </div>
                    </EditorialReveal>
                    <div className={`${styles.visual} ${styles.roastVisual}`}>
                        <StoryImage src="/images/coffee/coffee-roast-levels.webp" alt="Các cấp độ rang của hạt cà phê" />
                    </div>
                    <EditorialReveal>
                        <div className={styles.roastCopy}>
                            <p data-reveal="lines" data-reveal-at="0.3" className={styles.lede}>
                                Nhiệt độ mở khóa điều đất đai đã cất giữ.
                            </p>
                            <p data-reveal="lines" data-reveal-at="0.4">
                                Hạt xanh mang theo toàn bộ tiềm năng hương vị của nơi nó lớn lên. Người rang điều chỉnh thời gian và nhiệt độ cho từng mẻ để mở ra hương thơm, độ chua, thể chất và hậu
                                vị riêng thay vì ép mọi hạt vào cùng một công thức. Khi pha, độ xay, tỷ lệ nước và thời gian được cân chỉnh để câu chuyện từ nông trại hiện rõ trong từng ngụm.
                            </p>
                        </div>
                    </EditorialReveal>
                    <p className={styles.roastNote}>Nhiệt độ × thời gian × cảm quan</p>
                </div>
            </section>

            <section data-story-card className={`${styles.card} ${styles.brewingCard}`}>
                <CardIndex>05</CardIndex>
                <div className={`${styles.container} ${styles.brewingLayout} px-page`}>
                    <EditorialReveal>
                        <div className={styles.brewingCopy}>
                            <p data-reveal="block" className={styles.eyebrow}>
                                Điểm đến · Cũng là khởi đầu
                            </p>
                            <h2 data-reveal="words" data-reveal-at="0.15">
                                Trong <em>Tách</em>
                            </h2>
                            <p data-reveal="lines" data-reveal-at="0.3" className={styles.lede}>
                                Một ngụm nhỏ mang theo đất đỏ, mùa mưa và cả quãng đường dài của những bàn tay không xuất hiện trong khung hình.
                            </p>
                        </div>
                    </EditorialReveal>
                    <div className={`${styles.visual} ${styles.brewingVisual}`}>
                        <StoryImage src="/images/coffee/coffee-drinks-assortment.webp" alt="Những tách cà phê đã hoàn thiện" />
                    </div>
                    <p className={styles.brewingNote}>Chậm lại · Ngửi hương · Nhấp một ngụm</p>
                </div>
            </section>

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
