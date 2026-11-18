import { aboutImages as images } from "@/data/page-images";
import { aboutContent as content } from "@/data/page-content";
import { BrandMark } from "@/components/layout/BrandIntro";
import { ImmersivePage } from "@/components/layout/ImmersivePage";
import { EditorialReveal, RevealLine, RevealLink } from "@/components/ui/EditorialReveal";
import { ImageReveal } from "@/components/ui/ImageReveal";
import { SkeletonImage } from "@/components/ui/SkeletonImage";
import { ZALO_URL } from "@/data/contact";
import { createMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata = createMetadata({ title: "Về chúng tôi | Là Vườn Coffee", path: "/ve-chung-toi/" });

function Photo({ src, alt, className = "", sizes }: { src: string; alt: string; className?: string; sizes: string }) {
    return (
        <figure className={`${styles.photo} ${className}`}>
            <ImageReveal parallax={40}>
                <SkeletonImage src={src} alt={alt} fill sizes={sizes} className={styles.image} />
            </ImageReveal>
        </figure>
    );
}

export default function AboutPage() {
    return (
        <article className={styles.page}>
            <ImmersivePage
                backdrop={<SkeletonImage src={images.about_image_coffee_drinks_assortment} alt="" fill sizes="100vw" loading="eager" fetchPriority="high" className={styles.image} />}
                heroContent={
                    <EditorialReveal>
                        <div className={styles.heroHeading}>
                            <div data-reveal="block" className={styles.ornament}>
                                <BrandMark />
                            </div>
                            <p className={styles.eyebrow}>{content.about_eyebrow_1}</p>
                            <h1>
                                {content.about_h1_1}
                                <br />
                                {content.about_h1_2}
                            </h1>
                        </div>
                    </EditorialReveal>
                }
            >
                <div className={styles.heroTail}>
                    <Photo src={images.about_image_coffee_harvest_bucket} alt="Những đôi tay thu hái quả cà phê chín" className={styles.overlapPhoto} sizes="(min-width: 1024px) 17vw, 42vw" />
                </div>

                <section className={styles.homeIntro} aria-labelledby="about-intro-title">
                    <div className={styles.collage}>
                        <div className={styles.leftPhotos}>
                            <Photo src={images.about_image_ripe_coffee_cherries} alt="Quả cà phê đỏ chín trên cành" className={styles.smallPhoto} sizes="(min-width: 1025px) 12vw, 35vw" />
                            <Photo src={images.about_image_coffee_cherry_harvest} alt="Mùa thu hái cà phê giữa vườn xanh" className={styles.largePhoto} sizes="(min-width: 1025px) 24vw, 48vw" />
                        </div>
                        <EditorialReveal>
                            <div className={styles.introCopy}>
                                <div data-reveal="block" className={styles.ornament}>
                                    <BrandMark />
                                </div>
                                <h2 id="about-intro-title">
                                    {content.about_h2_1}
                                    <br />
                                    {content.about_h2_2}
                                </h2>
                                <p>{content.about_p_1}</p>
                                <RevealLink href="/cau-chuyen/" className={styles.cta}>
                                    {content.about_cta_1}
                                </RevealLink>
                            </div>
                        </EditorialReveal>
                        <div className={styles.rightPhotos}>
                            <Photo
                                src={images.about_image_lam_dong_coffee_farm}
                                alt="Những hàng cà phê trong sương sớm Lâm Đồng"
                                className={styles.largePhoto}
                                sizes="(min-width: 1025px) 24vw, 48vw"
                            />
                            <Photo src={images.about_image_coffee_parchment_drying} alt="Hạt cà phê được phơi trong nắng" className={styles.smallPhoto} sizes="(min-width: 1025px) 12vw, 35vw" />
                        </div>
                    </div>
                </section>

                <section className={styles.introAfter} aria-labelledby="about-meaning-title">
                    <RevealLine className="text-foreground/15" />
                    <EditorialReveal>
                        <div className={styles.meaningCopy}>
                            <h2 id="about-meaning-title" className={styles.eyebrow}>
                                {content.about_eyebrow_2}
                            </h2>
                            <p>{content.about_p_2}</p>
                        </div>
                    </EditorialReveal>
                </section>

                <section className={styles.centerSection} aria-labelledby="about-origin-title">
                    <EditorialReveal>
                        <div className={styles.centerCopy}>
                            <p className={styles.eyebrow}>{content.about_eyebrow_3}</p>
                            <h2 id="about-origin-title">
                                {content.about_h2_3}
                                <br />
                                {content.about_h2_4}
                            </h2>
                            <p>{content.about_p_3}</p>
                        </div>
                    </EditorialReveal>
                </section>

                <section className={styles.threePhotos} aria-label="Những khoảnh khắc từ vườn cà phê">
                    <Photo src={images.about_image_coffee_harvest_bucket} alt="Thu hái cà phê bằng tay" sizes="(min-width: 721px) 32vw, 48vw" />
                    <Photo src={images.about_image_coffee_beans_winnowing} alt="Cà phê sau thu hoạch trong chiếc nia tre" sizes="(min-width: 721px) 32vw, 48vw" />
                    <Photo src={images.about_image_coffee_drying_raking} alt="Chăm sóc những luống cà phê đang phơi" sizes="32vw" />
                </section>

                <section className={styles.valuesSection} aria-labelledby="about-values-title">
                    <EditorialReveal>
                        <div className={styles.centerCopy}>
                            <div data-reveal="block" className={styles.ornament}>
                                <BrandMark />
                            </div>
                            <h2 id="about-values-title">
                                {content.about_h2_5}
                                <br />
                                {content.about_h2_6}
                            </h2>
                            <p>{content.about_p_4}</p>
                        </div>
                    </EditorialReveal>
                    <div className={styles.photoPair} aria-label="Hai góc nhìn về hành trình cà phê">
                        <Photo src={images.about_image_raised_coffee_drying_beds} alt="Những giàn phơi cà phê dưới ánh nắng" sizes="50vw" />
                        <Photo src={images.about_image_coffee_roast_levels} alt="Sắc màu của hạt cà phê qua từng mức rang" sizes="50vw" />
                    </div>
                </section>

                <section className={styles.splitSection} aria-labelledby="about-everyday-title">
                    <div className={styles.ornamentRule}>
                        <RevealLine className={styles.ruleLine} />
                        <div data-reveal="block" className={styles.ornament}>
                            <BrandMark />
                        </div>
                    </div>
                    <div className={styles.splitGrid}>
                        <Photo src={images.about_image_ripe_coffee_cherries} alt="Sắc đỏ và xanh của những trái cà phê chín" sizes="(min-width: 721px) 36vw, 100vw" />
                        <EditorialReveal>
                            <div className={styles.splitCopy}>
                                <p className={styles.eyebrow}>{content.about_eyebrow_4}</p>
                                <h2 id="about-everyday-title">
                                    {content.about_h2_7}
                                    <br />
                                    {content.about_h2_8}
                                </h2>
                                <p>{content.about_p_5}</p>
                                <p>{content.about_p_6}</p>
                                <RevealLink href="/san-pham/" className={styles.cta}>
                                    {content.about_cta_2}
                                </RevealLink>
                            </div>
                        </EditorialReveal>
                    </div>
                </section>

                <div className={styles.widePhoto}>
                    <Photo src={images.about_image_lam_dong_coffee_farm_panorama} alt="Toàn cảnh vườn cà phê Lâm Đồng trong nắng sớm" sizes="100vw" />
                </div>

                <section className={styles.closingSection} aria-labelledby="about-closing-title">
                    <Photo src={images.about_image_coffee_drinks_assortment} alt="Những tách cà phê cho mỗi sở thích" className={styles.overlapPhoto} sizes="(min-width: 1024px) 17vw, 42vw" />
                    <EditorialReveal>
                        <div className={styles.centerCopy}>
                            <h2 id="about-closing-title">{content.about_h2_9}</h2>
                            <p>{content.about_p_7}</p>
                            <RevealLink href={ZALO_URL} className={styles.cta}>
                                {content.about_cta_3}
                            </RevealLink>
                        </div>
                    </EditorialReveal>
                </section>
            </ImmersivePage>
        </article>
    );
}
