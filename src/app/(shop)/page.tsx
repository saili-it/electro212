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
import { MiddleBanners } from "@/components/shop/middle-banners";
import { HeroSlider } from "@/components/shop/hero-slider";
import { SideBanners } from "@/components/shop/side-banners";
import { AdviceBanner } from "@/components/shop/advice-banner";
import { UniverseGrid } from "@/components/shop/universe-grid";
import { HeroCarousel } from "@/components/shop/hero-carousel";
import { ServicesStrip } from "@/components/shop/services-strip";
import { ProductCard } from "@/components/shop/product-card";
import { ProductCarousel } from "@/components/shop/product-carousel";
import { Reveal } from "@/components/shop/reveal";
import { BrandLogo } from "@/components/shop/brand-logo";
import { InspirationTiles } from "@/components/shop/inspiration-tiles";
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

function SectionHeading({
  id,
  title,
  href,
  linkLabel,
  className = "",
}: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <h2 id={id} className={`text-xl font-extrabold tracking-tight sm:text-2xl text-brand-dark`}>
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

/** A horizontal product rail with its heading, straight on the page background. */
function ProductRow({ id, title, products }: { id: string; title: string; products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-4 pt-14" aria-labelledby={id}>
        <ProductCarousel label={title} heading={<SectionHeading id={id} title={title} />}>
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
  const [categories, brands, deals, latest, featured, heroBanners, middleBanners, promoBanners] =
    await Promise.all([
      getMenuCategories(),
      getShopBrands(),
      getDealProducts(12),
      getLatestProducts(12),
      getFeaturedProducts(12),
      getHeroSlides(),
      getMiddleBanners(),
      getPromoBanners(),
    ]);
  // The "Publicités" banners sit beside the hero (first two).
  const sideBanners = promoBanners.slice(0, 2);
  const hasSide = sideBanners.length > 0;
  const categorySlugs = new Set(categories.flatMap((c) => [c.slug, ...c.children.map((child) => child.slug)]));
  // Text-slide fallback (config), only kept for the slides whose target category still exists.
  const fallbackSlides = heroSlides.filter((slide) => categorySlugs.has(slide.cta.categorySlug));

  return (
    <>
      <OrganizationJsonLd />
      <h1 className="sr-only">
        {siteConfig.name} — {siteConfig.tagline}
      </h1>

      {/*
        Hero (Electroplanet layout): the slider takes ¾ of the width with up to two side
        banners stacked on the right; with no side banners the slider runs full width.
        Phones: full-bleed slider, side banners underneath.
      */}
      <section className="mx-auto w-full max-w-7xl sm:px-4 sm:pt-5" aria-label="À la une">
        <div className={hasSide ? "grid gap-3 lg:grid-cols-[3fr_1fr] lg:items-start" : ""}>
          <div className="min-w-0">
            {heroBanners.length > 0 ? (
              // Phones keep the banner's ~16:9 ratio so the whole artwork shows (no side-crop).
              <HeroSlider
                slides={heroBanners}
                frameClassName={`aspect-[16/9] sm:rounded-2xl ${hasSide ? "lg:aspect-[2/1]" : "lg:aspect-[16/7]"}`}
              />
            ) : (
              <div
                className={`relative h-[420px] w-full overflow-hidden sm:h-[480px] ${hasSide ? "lg:aspect-[2/1] lg:h-auto" : "lg:h-[520px]"}`}
              >
                <HeroCarousel slides={fallbackSlides} />
              </div>
            )}
          </div>
          {hasSide && <SideBanners banners={sideBanners} />}
        </div>
      </section>

      <Reveal>
        <ServicesStrip />
      </Reveal>

      {categories.length > 0 && (
        <Reveal>
        <section className="mx-auto max-w-7xl px-4 pt-14" aria-labelledby="universes-title">
          <SectionHeading id="universes-title" title="Nos univers" className="mb-5" />
          <UniverseGrid categories={categories} />
        </section>
        </Reveal>
      )}

      <ProductRow id="deals-title" title="Les bons plans du moment" products={deals} />
      <Reveal>
        <InspirationTiles categorySlugs={categorySlugs} />
      </Reveal>

      <ProductRow id="latest-title" title="Nouveautés" products={latest} />

      <Reveal>
        <MiddleBanners banners={middleBanners} />
      </Reveal>

      <ProductRow id="offers-title" title="Découvrez nos meilleures offres !" products={featured} />

      {brands.length > 0 && (
        <Reveal>
        <section className="mx-auto max-w-7xl px-4 pt-14" aria-labelledby="brands-title">
          <SectionHeading id="brands-title" title="Nos marques" className="mb-5" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/marques/${brand.slug}`}
                  aria-label={`Produits ${brand.name}`}
                  className="flex h-20 items-center justify-center rounded-2xl bg-white px-4 text-lg font-extrabold uppercase tracking-wide text-slate-400 shadow-soft ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-1 hover:text-brand-dark hover:shadow-card sm:h-24"
                >
                  {brand.logoUrl ? <BrandLogo src={brand.logoUrl} name={brand.name} /> : brand.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        </Reveal>
      )}

      <Reveal>
        <AdviceBanner />
      </Reveal>
    </>
  );
}
