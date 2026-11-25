import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteConfig } from "@/config/site";

/*
 * Rendered per request (connection()), never prerendered: SITE_URL is a runtime variable in production,
 * so a build-time robots.txt would advertise the build machine's fallback (http://localhost:3000).
 * (With Cache Components, `export const dynamic` no longer exists — connection() is the replacement.)
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const base = siteConfig.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / non-indexable areas — keep crawlers off them. (Image files under
      // /uploads stay crawlable so product images can appear in image search.)
      disallow: ["/admin", "/api/", "/panier", "/commande", "/recherche"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
