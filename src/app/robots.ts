import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Crawlers must be able to read the global noindex meta/header.
      allow: "/",
      disallow: "/api/",
    },
  };
}
