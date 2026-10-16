import { siteConfig } from "@/config/site";
import { MetaPixel } from "@/components/shop/meta-pixel";
import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";
import { WhatsAppButton } from "@/components/shop/whatsapp-button";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    // Forced light surface: the storefront looks the same regardless of OS dark mode.
    <div className="flex min-h-screen flex-1 flex-col bg-surface text-slate-900 [color-scheme:light]">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <WhatsAppButton />
      {siteConfig.metaPixelId && <MetaPixel pixelId={siteConfig.metaPixelId} />}
    </div>
  );
}
