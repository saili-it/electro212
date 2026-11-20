import type { Metadata } from "next";
import { heroSlides } from "@/config/home";
import { siteConfig } from "@/config/site";
import {
  getCategoryRail,
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
import { BrandMarquee } from "@/components/shop/brand-marquee";
import { CategoryRail } from "@/components/shop/category-rail";
import { SectionHeading } from "@/components/shop/section-heading";
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

/** A horizontal product rail with its heading, straight on the page background. */
function ProductRow({
  id,
  title,
  kicker,
  products,
}: {
  id: string;
  title: string;
  kicker?: string;
  products: ProductCardData[];
}) {
  if (products.length === 0) return null;
  return (
    <Reveal>
      <section className="mx-auto max-w-7xl px-4 pt-14" aria-labelledby={id}>
        <ProductCarousel label={title} heading={<SectionHeading id={id} title={title} kicker={kicker} />}>
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
  const [categories, rail, brands, deals, latest, featured, heroBanners, middleBanners, promoBanners] =
    await Promise.all([
      getMenuCategories(),
      getCategoryRail(),
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

      <ServicesStrip />
      <CategoryRail categories={rail} />

      {categories.length > 0 && (
        <Reveal>
        <section className="mx-auto max-w-7xl px-4 pt-14" aria-labelledby="universes-title">
          <SectionHeading id="universes-title" kicker="Tout l'équipement de la maison" title="Nos univers" className="mb-6" />
          <UniverseGrid categories={categories} />
        </section>
        </Reveal>
      )}

      <ProductRow id="deals-title" kicker="Prix barrés" title="Les bons plans du moment" products={deals} />
      <ProductRow id="latest-title" kicker="Fraîchement arrivés" title="Nouveautés" products={latest} />

      <Reveal>
        <InspirationTiles categorySlugs={categorySlugs} />
      </Reveal>

      <Reveal>
        <MiddleBanners banners={middleBanners} />
      </Reveal>

      <ProductRow id="offers-title" kicker="Coups de cœur Electro212" title="Notre sélection" products={featured} />

      {brands.length > 0 && (
        <Reveal>
          <section className="mx-auto max-w-7xl px-4 pt-16" aria-labelledby="brands-title">
            <SectionHeading id="brands-title" kicker="Les grandes marques" title="Nos marques" className="mb-6" />
            <BrandMarquee brands={brands} />
          </section>
        </Reveal>
      )}

      <Reveal>
        <AdviceBanner />
      </Reveal>
    </>
  );
}
