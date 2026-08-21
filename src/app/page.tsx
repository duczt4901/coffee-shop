import type { Metadata } from "next";
import type { ReactElement } from "react";

import { ImmersivePage } from "@/components/layout/ImmersivePage";
import { CoffeeBagExperience } from "@/components/experience/CoffeeBagExperience";
import { createMetadata } from "@/lib/metadata";
import { EssenceSection } from "@/components/sections/home-page/EssenceSection";
import { ProcessGallerySection } from "@/components/sections/home-page/ProcessGallerySection";
import { HomePageVideo, ProductSection } from "@/components/sections/home-page";
import { LandingReveal } from "@/providers/LandingReveal";

export const metadata: Metadata = createMetadata({
    path: "/",
});

export default function HomePage(): ReactElement {
    return (
        <>
            <LandingReveal />
            <ImmersivePage backdrop={<HomePageVideo />}>
                <section className="relative z-10 w-full bg-background text-foreground">
                    <CoffeeBagExperience />
                </section>
                <EssenceSection />
                <ProcessGallerySection />
                <section className="bg-background text-foreground">
                    <ProductSection />
                </section>
            </ImmersivePage>
        </>
    );
}
