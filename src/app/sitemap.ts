import type { MetadataRoute } from "next";
import { database } from "@/lib/database";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: database.site.url,
      changeFrequency: "monthly",
      priority: 1,
    },
    // TODO: Thêm route mới khi bắt đầu xây nội dung.
  ];
}
