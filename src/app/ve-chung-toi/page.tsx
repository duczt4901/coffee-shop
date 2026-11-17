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
                backdrop={<SkeletonImage src="/images/coffee/coffee-drinks-assortment.webp" alt="" fill sizes="100vw" loading="eager" fetchPriority="high" className={styles.image} />}
                heroContent={
                    <EditorialReveal>
                        <div className={styles.heroHeading}>
                            <div data-reveal="block" className={styles.ornament}><BrandMark /></div>
                            <p className={styles.eyebrow}>Là Vườn Coffee · Lâm Hà, Lâm Đồng</p>
                            <h1>Về với Vườn,<br />chạm vị cà phê.</h1>
                        </div>
                    </EditorialReveal>
                }
            >
                <div className={styles.heroTail}>
                    <Photo src="/images/coffee/coffee-harvest-bucket.webp" alt="Những đôi tay thu hái quả cà phê chín" className={styles.overlapPhoto} sizes="(min-width: 1024px) 17vw, 42vw" />
                </div>

                <section className={styles.homeIntro} aria-labelledby="about-intro-title">
                    <div className={styles.collage}>
                        <div className={styles.leftPhotos}>
                            <Photo src="/images/coffee/ripe-coffee-cherries.webp" alt="Quả cà phê đỏ chín trên cành" className={styles.smallPhoto} sizes="(min-width: 1025px) 12vw, 35vw" />
                            <Photo src="/images/coffee/coffee-cherry-harvest.webp" alt="Mùa thu hái cà phê giữa vườn xanh" className={styles.largePhoto} sizes="(min-width: 1025px) 24vw, 48vw" />
                        </div>
                        <EditorialReveal>
                            <div className={styles.introCopy}>
                                <div data-reveal="block" className={styles.ornament}><BrandMark /></div>
                                <h2 id="about-intro-title">Chậm một chút,<br />đậm một ngày.</h2>
                                <p>Giữa những ngày vội vã, Vườn dành một khoảng lặng cho hương cà phê. Cho câu chuyện bên tách nhỏ, cho niềm vui thật giản dị. Một chút bình yên từ vườn, gửi đến nhịp sống mỗi ngày.</p>
                                <RevealLink href="/cau-chuyen/" className={styles.cta}>Câu chuyện của Vườn</RevealLink>
                            </div>
                        </EditorialReveal>
                        <div className={styles.rightPhotos}>
                            <Photo src="/images/coffee/lam-dong-coffee-farm.webp" alt="Những hàng cà phê trong sương sớm Lâm Đồng" className={styles.largePhoto} sizes="(min-width: 1025px) 24vw, 48vw" />
                            <Photo src="/images/coffee/coffee-parchment-drying.webp" alt="Hạt cà phê được phơi trong nắng" className={styles.smallPhoto} sizes="(min-width: 1025px) 12vw, 35vw" />
                        </div>
                    </div>
                </section>

                <section className={styles.introAfter} aria-labelledby="about-meaning-title">
                    <RevealLine className="text-foreground/15" />
                    <EditorialReveal>
                        <div className={styles.meaningCopy}>
                            <h2 id="about-meaning-title" className={styles.eyebrow}>Là Vườn — một lời nhắc sống chậm</h2>
                            <p>Một khu vườn cần nắng, cần mưa và cần thời gian. Một tách cà phê ngon cũng vậy. Với Là Vườn, điều đáng quý nằm trong những việc nhỏ: hiểu hạt cà phê mình chọn, chăm chút cách pha và dành cho nhau một cuộc trò chuyện trọn vẹn.</p>
                        </div>
                    </EditorialReveal>
                </section>

                <section className={styles.centerSection} aria-labelledby="about-origin-title">
                    <EditorialReveal>
                        <div className={styles.centerCopy}>
                            <p className={styles.eyebrow}>Từ vùng đất, đến từng tách nhỏ</p>
                            <h2 id="about-origin-title">Vị của đất lành,<br />tình của người làm.</h2>
                            <p>Cà phê mang theo dấu ấn của nơi nó lớn lên. Là màu đất, những mùa nắng mưa, đôi tay thu hái và sự kiên nhẫn sau mỗi công đoạn. Chúng tôi muốn kể câu chuyện ấy bằng một hương vị gần gũi, để mỗi lần pha là một lần thấy mình gần Vườn hơn.</p>
                        </div>
                    </EditorialReveal>
                </section>

                <section className={styles.threePhotos} aria-label="Những khoảnh khắc từ vườn cà phê">
                    <Photo src="/images/coffee/coffee-harvest-bucket.webp" alt="Thu hái cà phê bằng tay" sizes="(min-width: 721px) 32vw, 48vw" />
                    <Photo src="/images/coffee/coffee-beans-winnowing.webp" alt="Cà phê sau thu hoạch trong chiếc nia tre" sizes="(min-width: 721px) 32vw, 48vw" />
                    <Photo src="/images/coffee/coffee-drying-raking.webp" alt="Chăm sóc những luống cà phê đang phơi" sizes="32vw" />
                </section>

                <section className={styles.valuesSection} aria-labelledby="about-values-title">
                    <EditorialReveal>
                        <div className={styles.centerCopy}>
                            <div data-reveal="block" className={styles.ornament}><BrandMark /></div>
                            <h2 id="about-values-title">Mộc mạc từ hạt,<br />chân thành từ tâm.</h2>
                            <p>Chúng tôi yêu những điều có thể cảm nhận thật rõ: mùi hương khi mở gói, tiếng nước chạm vào cà phê và vị đậm còn ở lại sau cùng. Không cần một nghi thức cầu kỳ. Chỉ cần hương vị hợp với bạn, vào đúng khoảnh khắc bạn muốn chậm lại.</p>
                        </div>
                    </EditorialReveal>
                    <div className={styles.photoPair} aria-label="Hai góc nhìn về hành trình cà phê">
                        <Photo src="/images/coffee/raised-coffee-drying-beds.webp" alt="Những giàn phơi cà phê dưới ánh nắng" sizes="50vw" />
                        <Photo src="/images/coffee/coffee-roast-levels.webp" alt="Sắc màu của hạt cà phê qua từng mức rang" sizes="50vw" />
                    </div>
                </section>

                <section className={styles.splitSection} aria-labelledby="about-everyday-title">
                    <div className={styles.ornamentRule}>
                        <RevealLine className={styles.ruleLine} />
                        <div data-reveal="block" className={styles.ornament}><BrandMark /></div>
                    </div>
                    <div className={styles.splitGrid}>
                        <Photo src="/images/coffee/ripe-coffee-cherries.webp" alt="Sắc đỏ và xanh của những trái cà phê chín" sizes="(min-width: 721px) 36vw, 100vw" />
                        <EditorialReveal>
                            <div className={styles.splitCopy}>
                                <p className={styles.eyebrow}>Mang một chút Vườn về nhà</p>
                                <h2 id="about-everyday-title">Một tách quen,<br />một ngày mới.</h2>
                                <p>Có người thích một ly đen đậm vào buổi sáng. Có người chọn thêm chút sữa, thêm vài viên đá. Mỗi cách uống đều có một niềm vui riêng. Là Vườn muốn là hương vị bạn có thể tìm về, theo đúng cách của mình.</p>
                                <p>Từ chiếc phin quen thuộc đến những cách pha mới, hãy bắt đầu bằng một gói cà phê bạn thích. Phần còn lại là thời gian dành cho chính bạn.</p>
                                <RevealLink href="/san-pham/" className={styles.cta}>Khám phá cà phê</RevealLink>
                            </div>
                        </EditorialReveal>
                    </div>
                </section>

                <div className={styles.widePhoto}>
                    <Photo src="/images/coffee/lam-dong-coffee-farm-panorama.webp" alt="Toàn cảnh vườn cà phê Lâm Đồng trong nắng sớm" sizes="100vw" />
                </div>

                <section className={styles.closingSection} aria-labelledby="about-closing-title">
                    <Photo src="/images/coffee/coffee-drinks-assortment.webp" alt="Những tách cà phê cho mỗi sở thích" className={styles.overlapPhoto} sizes="(min-width: 1024px) 17vw, 42vw" />
                    <EditorialReveal>
                        <div className={styles.centerCopy}>
                            <h2 id="about-closing-title">Hẹn nhau một tách.</h2>
                            <p>Để Vườn cùng bạn chọn một hương vị phù hợp. Một câu hỏi về cà phê, một cách pha mới, hay đơn giản là một lời chào — chúng tôi luôn sẵn lòng lắng nghe.</p>
                            <RevealLink href={ZALO_URL} className={styles.cta}>Trò chuyện cùng Là Vườn</RevealLink>
                        </div>
                    </EditorialReveal>
                </section>
            </ImmersivePage>
        </article>
    );
}
