import { productsImages as images } from "@/data/page-images";
import { productsContent as content } from "@/data/page-content";
import type { Metadata } from "next";
import { SkeletonImage as Image } from "@/components/ui/SkeletonImage";
import Link from "next/link";
import { ImageReveal } from "@/components/ui/ImageReveal";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import { products } from "@/data/products";
import { formatListingPrice } from "@/lib/commerce";
import { createMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = createMetadata({
    title: "Sản phẩm | Là Vườn Coffee",
    description: "Khám phá bộ sưu tập cà phê Robusta và Arabica, với những hương vị từ cao nguyên Việt Nam.",
    path: "/san-pham/",
});

const journey = [
    { title: content.products_title_1, image: images.products_image_lam_dong_coffee_farm_panorama, alt: "Vườn cà phê trên cao nguyên Lâm Đồng" },
    { title: content.products_title_2, image: images.products_image_coffee_cherry_harvest, alt: "Những quả cà phê chín được thu hái vào giỏ" },
    { title: content.products_title_3, image: images.products_image_coffee_parchment_drying, alt: "Hạt cà phê sau khi được tách vỏ" },
    { title: content.products_title_4, image: images.products_image_sun_dried_coffee_cherries, alt: "Cà phê được phơi trên giàn sau thu hoạch" },
];

export default function ProductsPage() {
    return (
        <div className={styles.page}>
            <EditorialReveal>
                <header className={styles.intro}>
                    <h1 data-reveal="words">{content.products_h1_1}</h1>
                    <p data-reveal="lines">{content.products_p_1}</p>
                </header>
            </EditorialReveal>

            <section id="bo-suu-tap" className={styles.collection} aria-label="Bộ sưu tập cà phê">
                <ul className={styles.productGrid}>
                    {products.map((product, index) => (
                        <li key={product.slug} data-reveal-step={index + 1}>
                            <EditorialReveal>
                                <div>
                                    <Link href={`/san-pham/${product.slug}/`} className={styles.productCard}>
                                        <div data-reveal="block" className={styles.productImage}>
                                            <Image
                                                src={product.image}
                                                alt={product.name}
                                                fill
                                                sizes="(min-width: 1024px) 25vw, 50vw"
                                                loading="eager"
                                                fetchPriority={index === 0 ? "high" : undefined}
                                                className={styles.packshot}
                                                style={{ objectFit: "contain" }}
                                            />
                                            <span className={styles.sizeLabel}>{product.sizeLabel}</span>
                                            {product.badge && <span className={styles.badge}>{product.badge}</span>}
                                        </div>
                                        <div data-product-details className={styles.productInfo}>
                                            <h2>{product.name}</h2>
                                            <p>{formatListingPrice(product.priceVnd)}</p>
                                        </div>
                                    </Link>
                                </div>
                            </EditorialReveal>
                        </li>
                    ))}
                </ul>
            </section>

            <section className={styles.diptych} aria-label="Từ mùa thu hoạch đến hạt cà phê">
                <div className={styles.largePhoto}>
                    <ImageReveal parallax={60}>
                        <Image src={images.products_image_coffee_cherry_harvest} alt="Thu hái cà phê chín trên cao nguyên" fill sizes="(min-width: 768px) 48vw, 72vw" className={styles.photo} />
                    </ImageReveal>
                </div>
                <div className={styles.smallPhoto}>
                    <ImageReveal parallax={40}>
                        <Image src={images.products_image_sun_dried_coffee_cherries} alt="Những giàn phơi cà phê sau thu hoạch" fill sizes="(min-width: 768px) 32vw, 56vw" className={styles.photo} />
                    </ImageReveal>
                </div>
            </section>

            <section className={styles.journey} aria-labelledby="journey-title">
                <EditorialReveal>
                    <h2 data-reveal="words" id="journey-title">
                        {content.products_h2_1}
                    </h2>
                </EditorialReveal>
                <ul className={styles.journeyRail} aria-label="Các bước trong hành trình cà phê" tabIndex={0}>
                    {journey.map((step) => (
                        <li key={step.title}>
                            <figure>
                                <div className={styles.journeyImage}>
                                    <Image src={step.image} alt={step.alt} fill sizes="(min-width: 768px) 25vw, 76vw" className={styles.photo} />
                                </div>
                                <figcaption>{step.title}</figcaption>
                            </figure>
                        </li>
                    ))}
                </ul>
                <RevealLink href="/cau-chuyen/" variant="border" className={styles.textLink}>
                    {content.products_textlink_1}
                </RevealLink>
            </section>

            <section className={styles.feature} aria-labelledby="coffee-ritual-title">
                <div className={styles.featureImage}>
                    <Image
                        src={images.products_image_coffee_drinks_assortment}
                        alt="Espresso, cappuccino và những tách cà phê cho mỗi ngày"
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className={styles.photo}
                    />
                </div>
                <EditorialReveal>
                    <div className={styles.featureCopy}>
                        <h2 data-reveal="words" id="coffee-ritual-title">
                            {content.products_h2_2}
                            <br />
                            {content.products_h2_3}
                        </h2>
                        <ul>
                            <li data-reveal="lines">{content.products_li_1}</li>
                            <li data-reveal="lines">{content.products_li_2}</li>
                            <li data-reveal="lines">{content.products_li_3}</li>
                        </ul>
                        <RevealLink href="#bo-suu-tap">{content.products_reveallink_1}</RevealLink>
                    </div>
                </EditorialReveal>
            </section>
        </div>
    );
}
