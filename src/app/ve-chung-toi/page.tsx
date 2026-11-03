import { EditorialReveal } from "@/components/ui/EditorialReveal";

import styles from "./page.module.css";

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
