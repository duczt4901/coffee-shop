import type { MetadataRoute } from "next";
import { database } from "@/lib/database";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", database.site.url).toString(),
    host: database.site.url,
  };
}
