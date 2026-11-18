import type { Metadata } from "next";
import { database } from "@/lib/database";
import { pageSeo } from "@/data/page-content";

export function createMetadata({
  title = database.site.title,
  description = database.site.description,
  path = "/",
}: {
  title?: string;
  description?: string;
  path?: string;
} = {}): Metadata {
  const canonical = new URL(path, database.site.url).toString();
  const seo = pageSeo[path];
  title = seo?.title || title;
  description = seo?.description || description;

  return {
    title,
    description,
    keywords: database.site.keywords,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: database.site.locale,
      url: canonical,
      siteName: database.site.name,
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      // TODO: Thêm Open Graph image sau khi có nhận diện thương hiệu.
    },
    twitter: {
      card: "summary",
      title: seo?.twitterTitle || title,
      description: seo?.twitterDescription || description,
      // TODO: Thêm Twitter image sau khi có nhận diện thương hiệu.
    },
  };
}
