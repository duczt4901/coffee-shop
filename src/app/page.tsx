import type { Metadata } from "next";
import type { ReactElement } from "react";

import { ImmersivePage } from "@/components/layout/ImmersivePage";
import { CoffeeBagExperience } from "@/components/experience/CoffeeBagExperience";
import { createMetadata } from "@/lib/metadata";
import { CoffeeOriginSection } from "@/components/sections/home-page/CoffeeOriginSection";
import { ProcessGallerySection } from "@/components/sections/home-page/ProcessGallerySection";
import { HeroVideo, FeaturedProductsSection } from "@/components/sections/home-page";
// import { LandingReveal } from "@/providers/LandingReveal";

export const metadata: Metadata = createMetadata({
    path: "/",
});

export default function HomePage(): ReactElement {
    return (
        <>
            {/* <LandingReveal /> */}
            <ImmersivePage backdrop={<HeroVideo />}>
                <CoffeeBagExperience />
                <CoffeeOriginSection />
                <ProcessGallerySection />
                <section className="bg-background text-foreground">
                    <FeaturedProductsSection />
                </section>
            </ImmersivePage>
        </>
    );
}
