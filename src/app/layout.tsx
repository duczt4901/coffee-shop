import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { NavBar } from "@/components/layout/header";
import { JsonLd } from "@/components/seo/json-ld";
import { database } from "@/lib/database";
import { createMetadata } from "@/lib/metadata";
import "@/styles/globals.css";
import TransitionProvider from "@/providers/TransitionProvider";
import { cormorantUpright, lexend } from "@/styles/font";
import ReactLenis from "lenis/react";
import { ExperienceRuntime } from "@/components/experience/ExperienceRuntime";

export const metadata: Metadata = {
    metadataBase: new URL(database.site.url),
    applicationName: database.site.name,
    authors: [{ name: database.site.name }],
    creator: database.site.name,
    publisher: database.site.name,
    ...createMetadata(),
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: database.site.themeColor,
    colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang={database.site.language}>
            <body className={`${lexend.className} ${lexend.variable} ${cormorantUpright.variable}`}>
                <JsonLd
                    data={{
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        name: database.site.name,
                        url: database.site.url,
                        description: database.site.description,
                    }}
                />

                <ReactLenis
                    root
                    options={{
                        lerp: 0.12,
                        wheelMultiplier: 0.85,
                        smoothWheel: true,
                        syncTouch: false,
                    }}
                >
                    <ExperienceRuntime>
                        <TransitionProvider>
                            <NavBar />
                            <main id="main-content">{children}</main>
                            <Footer />
                        </TransitionProvider>
                    </ExperienceRuntime>
                </ReactLenis>
            </body>
        </html>
    );
}
