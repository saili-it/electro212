import Image from "next/image";
import Link from "next/link";
import type { ShopBanner } from "@/data/storefront";

const cardClass =
  "group block overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-card";

function BannerLink({ banner, children }: { banner: ShopBanner; children: React.ReactNode }) {
  if (banner.linkUrl.startsWith("/")) {
    return (
      <Link href={banner.linkUrl} className={cardClass} aria-label={banner.title}>
        {children}
      </Link>
    );
  }
  return (
    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className={cardClass} aria-label={banner.title}>
      {children}
    </a>
  );
}

/** Wide advertising banner(s) (placement = MIDDLE) shown in the middle of the home page. */
export function MiddleBanners({ banners }: { banners: ShopBanner[] }) {
  if (banners.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-12" aria-label="Publicité">
      <div className="flex flex-col gap-4">
        {banners.map((banner) => (
          <BannerLink key={banner.id} banner={banner}>
            <div className="relative aspect-[4/1] w-full">
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                sizes="(min-width: 1280px) 1216px, 100vw"
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </div>
          </BannerLink>
        ))}
      </div>
    </section>
  );
}
