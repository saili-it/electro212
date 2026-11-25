import { GTM_ID, META_PIXEL_ID } from "@/lib/meta";
import { MetaPixel } from "@/components/shop/meta-pixel";
import { GoogleTagManager } from "@/components/shop/google-tag-manager";
import { PageViewTracker } from "@/components/shop/page-view-tracker";
import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";
import { WhatsAppButton } from "@/components/shop/whatsapp-button";
import { ScrollToTop } from "@/components/shop/scroll-to-top";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    // Forced light surface: the storefront looks the same regardless of OS dark mode.
    <div className="flex min-h-screen flex-1 flex-col bg-surface text-slate-900 [color-scheme:light]">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <WhatsAppButton />
      <ScrollToTop />
      {/* Shop pages only: the admin back-office is never tracked. Meta Pixel and GTM load side by side
          (the pixel is NOT inside GTM — adding it there would count every Meta event twice). */}
      {META_PIXEL_ID && <MetaPixel />}
      {GTM_ID && <GoogleTagManager id={GTM_ID} />}
      {(META_PIXEL_ID || GTM_ID) && <PageViewTracker />}
    </div>
  );
}
