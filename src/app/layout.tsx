import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

// Friendly, modern geometric sans — warmer than a neutral grotesque, legible at every size.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = `${siteConfig.name} — ${siteConfig.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteTitle, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  robots: { index: true, follow: true },
  formatDetection: { telephone: true },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "fr_MA",
    url: "/",
    title: siteTitle,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image", title: siteTitle, description: siteConfig.description },
};

export const viewport: Viewport = {
  themeColor: "#0d0625",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
      // The inline script below sets data-anim before hydration; ignore that one attribute diff.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Marks JS as available so scroll-reveal styles apply; without it (or without
            JS) content stays fully visible. Runs during parse, before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.setAttribute('data-anim','')}catch(e){}" }} />
        {children}
      </body>
    </html>
  );
}
