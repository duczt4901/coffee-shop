import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ImageReveal } from "@/components/ui/ImageReveal";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import { products } from "@/data/products";
import { createMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = createMetadata({
    title: "Sản phẩm | Coffee Shop",
    description: "Khám phá bộ sưu tập cà phê Robusta và Arabica, với những hương vị từ cao nguyên Việt Nam.",
    path: "/san-pham/",
});

const journey = [
    { title: "Vùng trồng", image: "/images/coffee/lam-dong-coffee-farm-panorama.webp", alt: "Vườn cà phê trên cao nguyên Lâm Đồng" },
    { title: "Thu hái", image: "/images/coffee/coffee-cherry-harvest.webp", alt: "Những quả cà phê chín được thu hái vào giỏ" },
    { title: "Sơ chế", image: "/images/coffee/coffee-parchment-drying.webp", alt: "Hạt cà phê sau khi được tách vỏ" },
    { title: "Phơi sấy", image: "/images/coffee/sun-dried-coffee-cherries.webp", alt: "Cà phê được phơi trên giàn sau thu hoạch" },
];

export default function ProductsPage() {
    return (
        <div className={styles.page}>
            <EditorialReveal>
                <header className={styles.intro}>
                    <h1 data-reveal="words">Sản phẩm</h1>
                    <p data-reveal="lines" data-reveal-at="0.25">
                        Cà phê từ cao nguyên, cho mỗi ngày.
                    </p>
                </header>
            </EditorialReveal>

            <section id="bo-suu-tap" className={styles.collection} aria-label="Bộ sưu tập cà phê">
                <ul className={styles.productGrid}>
                    {products.map((product) => (
                        <li key={product.slug}>
                            <EditorialReveal>
                                <div data-reveal="block">
                                    <Link href={`/san-pham/${product.slug}/`} className={styles.productCard}>
                                        <div className={styles.productImage}>
                                            <Image src={product.image} alt={product.name} fill sizes="(min-width: 1024px) 25vw, 50vw" priority className={styles.packshot} />
                                            <span className={styles.sizeLabel}>{product.sizeLabel}</span>
                                            {product.badge && <span className={styles.badge}>{product.badge}</span>}
                                        </div>
                                        <div data-product-details className={styles.productInfo}>
                                            <h2>{product.name}</h2>
                                            <p>{product.price}</p>
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
                        <Image src="/images/coffee/coffee-cherry-harvest.webp" alt="Thu hái cà phê chín trên cao nguyên" fill sizes="(min-width: 768px) 48vw, 72vw" className={styles.photo} />
                    </ImageReveal>
                </div>
                <div className={styles.smallPhoto}>
                    <ImageReveal parallax={40}>
                        <Image src="/images/coffee/sun-dried-coffee-cherries.webp" alt="Những giàn phơi cà phê sau thu hoạch" fill sizes="(min-width: 768px) 32vw, 56vw" className={styles.photo} />
                    </ImageReveal>
                </div>
            </section>

            <section className={styles.journey} aria-labelledby="journey-title">
                <EditorialReveal>
                    <h2 data-reveal="words" id="journey-title">
                        Hành trình của hạt cà phê
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
                    Khám phá toàn bộ hành trình
                </RevealLink>
            </section>

            <section className={styles.feature} aria-labelledby="coffee-ritual-title">
                <div className={styles.featureImage}>
                    <Image
                        src="/images/coffee/coffee-drinks-assortment.webp"
                        alt="Espresso, cappuccino và những tách cà phê cho mỗi ngày"
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className={styles.photo}
                    />
                </div>
                <EditorialReveal>
                    <div className={styles.featureCopy}>
                        <h2 data-reveal="words" id="coffee-ritual-title">
                            Tìm hương vị
                            <br />
                            của riêng bạn
                        </h2>
                        <ul>
                            <li data-reveal="lines">Robusta đậm vị, Arabica thanh ngọt</li>
                            <li data-reveal="lines">Nhiều khối lượng cho nhịp pha mỗi ngày</li>
                            <li data-reveal="lines">Thông tin nguồn gốc và sơ chế rõ ràng</li>
                        </ul>
                        <RevealLink href="#bo-suu-tap">Chọn cà phê của bạn</RevealLink>
                    </div>
                </EditorialReveal>
            </section>
        </div>
    );
}
