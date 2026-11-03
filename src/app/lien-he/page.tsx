import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import styles from "./page.module.css";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";

export const metadata: Metadata = createMetadata({
    title: "Liên hệ | Coffee Shop",
    description: "Thông tin liên hệ và các đầu mối hỗ trợ của Coffee Shop.",
    path: "/lien-he/",
});

const emailContacts = [
    { label: "Đơn hàng & sản phẩm", email: "lorem@example.com" },
    { label: "Hợp tác bán sỉ", email: "ipsum@example.com" },
    { label: "Tuyển dụng", email: "dolor@example.com" },
    { label: "Các yêu cầu khác", email: "amet@example.com" },
];

export default function ContactPage() {
    return (
        <article className={styles.page}>
            <div className={styles.content}>
                <EditorialReveal>
                    <header>
                        <h1 data-reveal="words">Thông tin liên hệ</h1>

                        <p data-reveal="lines" data-reveal-at="0.25" className={styles.intro}>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                        </p>
                    </header>
                </EditorialReveal>

                <EditorialReveal>
                    <section className={styles.contactGroup} aria-labelledby="contact-address-title">
                        <h2 data-reveal="words" id="contact-address-title">
                            Địa chỉ
                        </h2>
                        <address data-reveal="lines">
                            Lorem Ipsum — Dolor Sit Amet
                            <br />
                            123 Lorem Ipsum
                            <br />
                            Consectetur Adipiscing Elit
                        </address>
                    </section>
                </EditorialReveal>

                <EditorialReveal>
                    <section className={styles.contactGroup} aria-labelledby="contact-phone-title">
                        <h2 data-reveal="words" id="contact-phone-title">
                            Điện thoại
                        </h2>
                        <p data-reveal="lines">Lorem ipsum dolor sit amet.</p>
                        <p data-reveal="lines">Giờ liên hệ: Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                    </section>
                </EditorialReveal>

                <section className={styles.emailGroup} aria-labelledby="contact-email-title">
                    <EditorialReveal>
                        <h2 data-reveal="words" id="contact-email-title">
                            Email liên hệ
                        </h2>
                    </EditorialReveal>
                    <ul>
                        {emailContacts.map(({ label, email }, index) => (
                            <li key={email}>
                                <RevealLink href={`mailto:${email}`} variant="border" delay={index * 0.1}>
                                    {label}: {email}
                                </RevealLink>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </article>
    );
}
