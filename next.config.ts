import type { NextConfig } from "next";

/** Allow next/image to optimise images served from the S3/CDN bucket, when configured. */
function cdnRemotePatterns() {
  const url = process.env.STORAGE_PUBLIC_CDN_URL;
  if (!url) return [];
  try {
    const u = new URL(url);
    return [{ protocol: u.protocol.replace(":", "") as "http" | "https", hostname: u.hostname }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Serve AVIF/WebP and let next/image generate right-sized variants, so a
    // product card no longer downloads the full-resolution source image.
    formats: ["image/avif", "image/webp"],
    // Local /uploads/* (same origin) is allowed by default; this covers the CDN.
    remotePatterns: cdnRemotePatterns(),
    minimumCacheTTL: 31536000,
  },
  experimental: {
    // Next.js unconditionally buffers every request body that passes
    // through proxy.ts, silently truncating (no error, just a console
    // warning) past this cap — which would otherwise corrupt large CSV
    // imports / multi-image uploads instead of failing loudly. Must stay
    // >= serverActions.bodySizeLimit, since proxy buffers first.
    proxyClientMaxBodySize: "15mb",
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
