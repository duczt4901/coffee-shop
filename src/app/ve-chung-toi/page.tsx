import { EditorialReveal } from "@/components/ui/EditorialReveal";
import { createMetadata } from "@/lib/metadata";

import styles from "./page.module.css";

export const metadata = createMetadata({ title: "Về chúng tôi | Là Vườn Coffee", path: "/ve-chung-toi/" });

const AboutPage = () => {
    return (
        <section className={styles.page}>
            <EditorialReveal>
                <h1 data-reveal="words" className="max-w-full px-page text-center">
                    Về chúng tôi
                </h1>
            </EditorialReveal>
        </section>
    );
};

export default AboutPage;
