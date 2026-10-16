import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getSitemapEntries } from "@/data/storefront";

const base = siteConfig.url.replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/promotions`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/cgv`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const dynamicEntries: MetadataRoute.Sitemap = (await getSitemapEntries()).map((entry) => ({
    url: `${base}${entry.path}`,
    lastModified: entry.lastModified,
    changeFrequency: "weekly" as const,
    priority: entry.path.startsWith("/produits/") ? 0.7 : 0.6,
  }));

  return [...staticEntries, ...dynamicEntries];
}
