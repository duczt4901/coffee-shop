import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

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
                <h1>Thông tin liên hệ</h1>

                <p className={styles.intro}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                    ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>

                <section className={styles.contactGroup} aria-labelledby="contact-address-title">
                    <h2 id="contact-address-title">Địa chỉ</h2>
                    <address>
                        Lorem Ipsum — Dolor Sit Amet
                        <br />
                        123 Lorem Ipsum
                        <br />
                        Consectetur Adipiscing Elit
                    </address>
                </section>

                <section className={styles.contactGroup} aria-labelledby="contact-phone-title">
                    <h2 id="contact-phone-title">Điện thoại</h2>
                    <p>Lorem ipsum dolor sit amet.</p>
                    <p>Giờ liên hệ: Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                </section>

                <section className={styles.emailGroup} aria-labelledby="contact-email-title">
                    <h2 id="contact-email-title">Email liên hệ</h2>
                    <ul>
                        {emailContacts.map(({ label, email }) => (
                            <li key={email}>
                                <span>{label}: </span>
                                <a href={`mailto:${email}`}>{email}</a>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </article>
    );
}
