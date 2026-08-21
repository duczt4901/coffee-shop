import type { Metadata } from "next";
import { database } from "@/lib/database";

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

  return {
    title,
    description,
    keywords: database.site.keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: database.site.locale,
      url: canonical,
      siteName: database.site.name,
      title,
      description,
      // TODO: Thêm Open Graph image sau khi có nhận diện thương hiệu.
    },
    twitter: {
      card: "summary",
      title,
      description,
      // TODO: Thêm Twitter image sau khi có nhận diện thương hiệu.
    },
  };
}
