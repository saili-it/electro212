import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ShopBanner } from "@/data/storefront";

function BannerLink({ banner, className, children }: { banner: ShopBanner; className: string; children: ReactNode }) {
  if (banner.linkUrl.startsWith("/")) {
    return (
      <Link href={banner.linkUrl} className={className} aria-label={banner.title}>
        {children}
      </Link>
    );
  }
  return (
    <a href={banner.linkUrl} className={className} aria-label={banner.title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * "Publicités" banners beside the hero slider (placement = PROMO), stacked in a column on
 * desktop. That column is 2:3 and a third of the slider's width, so it ends
 * exactly where the 2:1 slider image ends; on smaller screens the banners sit
 * under the slider instead.
 */
export function SideBanners({ banners }: { banners: ShopBanner[] }) {
  return (
    <div
      className={`grid gap-3 px-4 sm:grid-cols-2 sm:px-0 lg:aspect-[2/3] lg:grid-cols-1 ${
        banners.length > 1 ? "lg:grid-rows-2" : "lg:grid-rows-1"
      }`}
    >
      {banners.map((banner) => (
        <BannerLink
          key={banner.id}
          banner={banner}
          className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 lg:aspect-auto"
        >
          <Image
            src={banner.imageUrl}
            alt={banner.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          <span
            aria-hidden
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-dark shadow-md transition group-hover:bg-brand-red-600 group-hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </BannerLink>
      ))}
    </div>
  );
}
