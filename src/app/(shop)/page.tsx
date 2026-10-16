import type { Metadata } from "next";
import Link from "next/link";
import { heroSlides } from "@/config/home";
import { siteConfig } from "@/config/site";
import {
  getDealProducts,
  getFeaturedProducts,
  getHeroSlides,
  getLatestProducts,
  getMenuCategories,
  getMiddleBanners,
  getPromoBanners,
  getShopBrands,
} from "@/data/storefront";
import { PromoBanners } from "@/components/shop/promo-banners";
import { MiddleBanners } from "@/components/shop/middle-banners";
import { HeroSlider } from "@/components/shop/hero-slider";
import { formatDh } from "@/lib/money";
import { CategoryIcon } from "@/components/shop/category-icon";
import { HeroCarousel } from "@/components/shop/hero-carousel";
import { ServicesStrip } from "@/components/shop/services-strip";
import { ProductCard } from "@/components/shop/product-card";
import { ProductCarousel } from "@/components/shop/product-carousel";
import { Reveal } from "@/components/shop/reveal";
import type { ProductCardData } from "@/data/storefront";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [{ url: "/brand/logo.png", width: 628, height: 444, alt: siteConfig.name }],
  },
};

function ScrollHint() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-12 flex flex-col items-center gap-2 text-white sm:bottom-16" aria-hidden>
      <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur-sm">Découvrir la boutique</span>
      <span className="flex h-9 w-9 animate-bounce items-center justify-center rounded-full bg-white/25 backdrop-blur-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}

function SectionHeading({ id, title, href, linkLabel }: { id: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 id={id} className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-[1.7rem]">
        <span className="h-7 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-brand-red to-brand-red-700" aria-hidden />
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-red-700 transition hover:bg-brand-red-50"
        >
          {linkLabel ?? "Voir tout"} →
        </Link>
      )}
    </div>
  );
}

function ProductRow({ id, title, products }: { id: string; title: string; products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-4 pt-12" aria-labelledby={id}>
        <SectionHeading id={id} title={title} />
        <ProductCarousel label={title}>
          {products.map((product) => (
            <div key={product.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%] xl:w-[19%]">
              <ProductCard product={product} className="h-full" />
            </div>
          ))}
        </ProductCarousel>
      </section>
    </Reveal>
  );
}

function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: new URL("/brand/logo.png", siteConfig.url).toString(),
    contactPoint: [{ "@type": "ContactPoint", telephone: siteConfig.phone.e164, contactType: "customer service" }],
  };
  return (
    <script
      type="application/ld+json"
      // Built from our own config only, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default async function HomePage() {
  const [categories, brands, deals, latest, featured, promoBanners, heroBanners, middleBanners] = await Promise.all([
    getMenuCategories(),
    getShopBrands(),
    getDealProducts(12),
    getLatestProducts(12),
    getFeaturedProducts(12),
    getPromoBanners(),
    getHeroSlides(),
    getMiddleBanners(),
  ]);
  const categorySlugs = new Set(categories.flatMap((c) => [c.slug, ...c.children.map((child) => child.slug)]));
  // Text-slide fallback (config), only kept for the slides whose target category still exists.
  const fallbackSlides = heroSlides.filter((slide) => categorySlugs.has(slide.cta.categorySlug));

  return (
    <>
      <OrganizationJsonLd />
      <h1 className="sr-only">
        {siteConfig.name} — {siteConfig.tagline}
      </h1>

      {/* Cinematic hero: a wide banner with an overlaid bar; the full nav reveals on scroll. */}
      <section className="relative h-[460px] w-full overflow-hidden sm:h-[540px] lg:h-[620px]" aria-label="À la une">
        {heroBanners.length > 0 ? (
          <HeroSlider slides={heroBanners} />
        ) : (
          <HeroCarousel slides={fallbackSlides} />
        )}
        <ScrollHint />
      </section>

      <Reveal>
        <ServicesStrip />
      </Reveal>

      {promoBanners.length > 0 && (
        <Reveal>
          <PromoBanners banners={promoBanners} />
        </Reveal>
      )}

      {categories.length > 0 && (
        <Reveal>
        <section className="mx-auto max-w-7xl px-4 pt-12" aria-labelledby="universes-title">
          <SectionHeading id="universes-title" title="Nos univers" />
          <ul className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="group flex h-full flex-col items-center gap-3 rounded-2xl bg-white px-2 py-5 text-center shadow-soft ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-1 hover:shadow-card hover:ring-brand-red/30"
                >
                  <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-surface text-brand-navy ring-1 ring-slate-100 transition group-hover:bg-brand-red-50 group-hover:text-brand-red-600 sm:h-20 sm:w-20">
                    {category.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin-provided URL, host not known in advance
                      <img src={category.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <CategoryIcon slug={category.slug} className="h-9 w-9 sm:h-11 sm:w-11" />
                    )}
                  </span>
                  <span className="text-xs font-semibold text-brand-navy sm:text-sm">{category.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        </Reveal>
      )}

      <ProductRow id="deals-title" title="Les bons plans du moment" products={deals} />
      <ProductRow id="latest-title" title="Nouveautés" products={latest} />

      <Reveal>
        <MiddleBanners banners={middleBanners} />
      </Reveal>

      <ProductRow id="offers-title" title="Découvrez nos meilleures offres !" products={featured} />

      {brands.length > 0 && (
        <Reveal>
        <section className="mx-auto max-w-7xl px-4 pt-12" aria-labelledby="brands-title">
          <SectionHeading id="brands-title" title="Nos marques" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/marques/${brand.slug}`}
                  className="flex h-20 items-center justify-center rounded-2xl bg-white px-4 text-lg font-extrabold uppercase tracking-wide text-slate-400 shadow-soft ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-1 hover:text-brand-navy hover:shadow-card"
                >
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-provided URL, host not known in advance
                    <img src={brand.logoUrl} alt={brand.name} className="max-h-10 w-auto object-contain" />
                  ) : (
                    brand.name
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        </Reveal>
      )}

      <Reveal>
      <section className="mx-auto max-w-7xl px-4 pt-12" aria-labelledby="about-title">
        <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/70 sm:p-8">
          <h2 id="about-title" className="text-lg font-extrabold tracking-tight text-brand-navy">
            Electro212, l&apos;électroménager et la TV au Maroc
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600">
            Retrouvez chez {siteConfig.name} le gros et le petit électroménager, les téléviseurs et accessoires, la
            climatisation et le confort de la maison, l&apos;encastrable et les meubles TV
            {brands.length > 0 && <> des marques {brands.map((b) => b.name).join(", ")}</>}. Livraison gratuite dès{" "}
            {formatDh(siteConfig.freeDeliveryThresholdMad)} d&apos;achat, et une équipe joignable 24/7 au{" "}
            {siteConfig.phone.display} pour vous conseiller.
          </p>
        </div>
      </section>
      </Reveal>
    </>
  );
}
