import { formatPrice, FREE_SHIPPING_THRESHOLD } from "@/lib/commerce";
import styles from "./BenefitsSection.module.css";

const benefits = [
    { title: "Cà phê từ Lâm Đồng", description: "Các dòng Robusta và Arabica có thông tin xuất xứ, sơ chế và mức rang ngay trên trang sản phẩm." },
    { title: `Miễn phí giao hàng từ ${formatPrice(FREE_SHIPPING_THRESHOLD)}`, description: `Đơn hàng có tiền hàng từ ${formatPrice(FREE_SHIPPING_THRESHOLD)} được miễn phí giao hàng. Với đơn dưới mức này, cửa hàng xác nhận phí giao hàng trước khi gửi.` },
    { title: "Thanh toán khi nhận hàng", description: "Đặt hàng COD, không cần thanh toán trước. Cửa hàng liên hệ xác nhận thông tin trước khi giao." },
];

export function BenefitsSection() {
    return (
        <section data-home-benefits className={styles.section} aria-labelledby="home-benefits-title">
            <h2 id="home-benefits-title" className={styles.label}>Quyền lợi khi mua trực tiếp:</h2>
            <ul className={styles.list}>
                {benefits.map(({ title }) => (
                    <li key={title}>
                        <button type="button" className={styles.item} popoverTarget="home-benefits-details" aria-haspopup="dialog">
                            {/* Reserved for the approved sun icon once image generation is available. */}
                            <span data-benefit-icon aria-hidden="true" className={styles.icon} />
                            <span>{title}</span>
                        </button>
                    </li>
                ))}
            </ul>
            <div id="home-benefits-details" popover="auto" role="dialog" aria-labelledby="home-benefits-details-title" data-lenis-prevent className={styles.details}>
                <div className={styles.detailsHeader}>
                    <h2 id="home-benefits-details-title">Quyền lợi khi mua trực tiếp</h2>
                    <button type="button" popoverTarget="home-benefits-details" popoverTargetAction="hide" className={styles.close}>Đóng</button>
                </div>
                <dl className={styles.descriptions}>
                    {benefits.map(({ title, description }) => (
                        <div key={title}>
                            <dt>{title}</dt>
                            <dd>{description}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}
