import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const base = siteConfig.url.replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
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
