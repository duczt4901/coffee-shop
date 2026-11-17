import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { JsonLd } from "@/components/seo/json-ld";
import { database } from "@/lib/database";
import { createMetadata } from "@/lib/metadata";
import "@/styles/globals.css";
import TransitionProvider from "@/providers/TransitionProvider";
import { cormorantUpright, lexend } from "@/styles/font";
import { PageScrollbar } from "@/components/layout/PageScrollbar";
import SmoothScroll from "@/providers/SmoothScroll";
import "lenis/dist/lenis.css";

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
        <html lang={database.site.language} suppressHydrationWarning>
            <head>
                <link rel="preload" as="script" href="/scripts/page-reveal.js" fetchPriority="high" />
            </head>
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

                {/* Stable CSS viewport shared by the existing scroll effects. */}
                <div data-scroll-viewport aria-hidden="true" className="pointer-events-none invisible fixed top-0 left-0 w-0" />
                <SmoothScroll>
                    <TransitionProvider>
                        <div data-site-content suppressHydrationWarning>
                            <SiteHeader />
                            <main id="main-content">{children}</main>
                            <SiteFooter />
                            <PageScrollbar />
                        </div>
                    </TransitionProvider>
                </SmoothScroll>
                <script src="/scripts/page-reveal.js" defer fetchPriority="high" />
            </body>
        </html>
    );
}
