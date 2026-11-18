import { contactContent as content } from "@/data/page-content";
import { contactImages } from "@/data/page-images";
import { SkeletonImage } from "@/components/ui/SkeletonImage";
import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import styles from "./page.module.css";
import { EditorialReveal, RevealLink } from "@/components/ui/EditorialReveal";
import { ZALO_PHONE, ZALO_URL } from "@/data/contact";

export const metadata: Metadata = createMetadata({
    title: "Liên hệ | Là Vườn Coffee",
    description: "Thông tin liên hệ và các đầu mối hỗ trợ của Là Vườn Coffee.",
    path: "/lien-he/",
});

const emailContacts = [
    { label: content.contact_label_1, email: content.contact_email_1 },
    { label: content.contact_label_2, email: content.contact_email_2 },
    { label: content.contact_label_3, email: content.contact_email_3 },
    { label: content.contact_label_4, email: content.contact_email_4 },
];

export default function ContactPage() {
    return (
        <article className={styles.page}>
            <div className={styles.content}>
                <EditorialReveal>
                    <header>
                        <h1 data-reveal="words">{content.contact_h1_1}</h1>
                        {contactImages.contact_image_intro && <SkeletonImage src={contactImages.contact_image_intro} alt="" width={1600} height={900} sizes="(min-width: 768px) 50vw, 100vw" className="my-8 aspect-video w-full object-cover" />}

                        <p data-reveal="lines" className={styles.intro}>
                            {content.contact_intro_1}
                        </p>
                    </header>
                </EditorialReveal>

                <EditorialReveal>
                    <section className={styles.contactGroup} aria-labelledby="contact-address-title">
                        <h2 data-reveal="words" id="contact-address-title">
                            {content.contact_h2_1}
                        </h2>
                        <address data-reveal="lines">
                            {content.contact_address_1}
                            <br />
                            {content.contact_address_2}
                            <br />
                            {content.contact_address_3}
                        </address>
                    </section>
                </EditorialReveal>

                <EditorialReveal>
                    <section className={styles.contactGroup} aria-labelledby="contact-phone-title">
                        <h2 data-reveal="words" id="contact-phone-title">
                            {content.contact_h2_2}
                        </h2>
                        <p data-reveal="lines">
                            <a href={`tel:${ZALO_PHONE}`}>{ZALO_PHONE}</a>
                        </p>
                        <RevealLink href={ZALO_URL} variant="border">
                            {content.contact_reveallink_1}
                        </RevealLink>
                    </section>
                </EditorialReveal>

                <section className={styles.emailGroup} aria-labelledby="contact-email-title">
                    <EditorialReveal>
                        <h2 data-reveal="words" id="contact-email-title">
                            {content.contact_h2_3}
                        </h2>
                    </EditorialReveal>
                    <ul>
                        {emailContacts.map(({ label, email }) => (
                            <li key={email}>
                                <RevealLink href={`mailto:${email}`} variant="border">
                                    {label}
                                    {content.contact_reveallink_2} {email}
                                </RevealLink>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </article>
    );
}
