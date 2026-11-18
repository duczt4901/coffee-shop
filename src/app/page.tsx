import type { Metadata } from "next";
import { homeContent } from "@/data/page-content";
import type { ReactElement } from "react";

import { ImmersivePage } from "@/components/layout/ImmersivePage";
import { CoffeeBagExperience } from "@/components/experience/CoffeeBagExperience";
import { createMetadata } from "@/lib/metadata";
import { CoffeeOriginSection } from "@/components/sections/home-page/CoffeeOriginSection";
import { ProcessGallerySection } from "@/components/sections/home-page/ProcessGallerySection";
import { HeroVideo, FeaturedProductsSection } from "@/components/sections/home-page";
import { BrandIntro } from "@/components/layout/BrandIntro";
import styles from "./page.module.css";
// import { BenefitsSection } from "@/components/sections/home-page/BenefitsSection";

export const metadata: Metadata = createMetadata({
    path: "/",
});

export default function HomePage(): ReactElement {
    return (
        <>
            <ImmersivePage backdrop={<HeroVideo />} heroContent={<div data-hero-brand className={styles.heroBrand}><BrandIntro heading slogan={homeContent.hero_slogan} /></div>}>
                {/* <BenefitsSection /> */}
                <div className={styles.homeSections}>
                    <CoffeeBagExperience />
                    <CoffeeOriginSection />
                    <ProcessGallerySection />
                    <section className="bg-background text-foreground">
                        <FeaturedProductsSection />
                    </section>
                </div>
            </ImmersivePage>
        </>
    );
}
