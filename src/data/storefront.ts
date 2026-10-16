import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { CATALOG_TAG } from "@/lib/cache-tags";
import { orderCategoryTree } from "@/lib/category-tree";

/*
 * Public, cached catalogue reads. No admin check: everything here is what
 * any visitor may see — active categories/brands and PUBLISHED products only.
 * Results are plain serializable DTOs (no Decimal/Date) as required by "use cache".
 * Admin writes call refreshStorefront() (lib/cache-tags) to expire CATALOG_TAG.
 */

export type MenuCategory = { id: string; slug: string; name: string; imageUrl: string | null; children: MenuChild[] };
export type MenuChild = { id: string; slug: string; name: string };

export async function getMenuCategories(): Promise<MenuCategory[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const rows = await prisma.category.findMany({
    where: { isActive: true },
    include: { translations: { where: { locale: DEFAULT_LOCALE } } },
  });

  const ordered = orderCategoryTree(
    rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      name: row.translations[0]?.name ?? row.slug,
      position: row.position,
      slug: row.slug,
      imageUrl: row.imageUrl,
    })),
  );

  const menu: MenuCategory[] = [];
  for (const category of ordered) {
    if (category.depth === 0) {
      menu.push({ id: category.id, slug: category.slug, name: category.name, imageUrl: category.imageUrl, children: [] });
    } else if (category.depth === 1 && menu.length > 0) {
      menu[menu.length - 1].children.push({ id: category.id, slug: category.slug, name: category.name });
    }
  }
  return menu;
}

export type ShopBrand = { id: string; slug: string; name: string; logoUrl: string | null };

export async function getShopBrands(): Promise<ShopBrand[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  return prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, logoUrl: true },
  });
}

export type ShopBanner = {
  id: string;
  title: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  linkUrl: string;
  ctaLabel: string;
  footnote: string | null;
  headline: string | null;
  subtitle: string | null;
  /** ISO string — serializable, and lets the browser hide the banner at the exact end time. */
  endsAt: string | null;
};

/**
 * Live banners for a placement. Re-evaluated every few minutes ("minutes"
 * profile) so scheduled ones appear and expired ones disappear without an
 * admin action; the client also hides a banner the moment its endsAt passes.
 */
async function getActiveBanners(placement: "HERO" | "PROMO" | "MIDDLE"): Promise<ShopBanner[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const now = new Date();
  const rows = await prisma.banner.findMany({
    where: {
      placement,
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    imageUrl: row.imageUrl,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    linkUrl: row.linkUrl,
    ctaLabel: row.ctaLabel,
    footnote: row.footnote,
    headline: row.headline,
    subtitle: row.subtitle,
    endsAt: row.endsAt?.toISOString() ?? null,
  }));
}

export function getHeroSlides(): Promise<ShopBanner[]> {
  return getActiveBanners("HERO");
}

export function getPromoBanners(): Promise<ShopBanner[]> {
  return getActiveBanners("PROMO");
}

export function getMiddleBanners(): Promise<ShopBanner[]> {
  return getActiveBanners("MIDDLE");
}

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  priceMinorUnits: number;
  compareAtPriceMinorUnits: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  inStock: boolean;
};

const productCardInclude = {
  translations: { where: { locale: DEFAULT_LOCALE } },
  brand: { select: { name: true, isActive: true } },
  images: { orderBy: { position: "asc" as const }, take: 1 },
  inventory: { select: { stockQuantity: true, reservedQuantity: true } },
};

export async function getLatestProducts(limit = 12): Promise<ProductCardData[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: { status: "PUBLISHED", primaryCategory: { isActive: true } },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: productCardInclude,
  });
  return rows.map(toProductCard);
}

/** "Bons plans": published products with a crossed-out price, biggest discount first. */
export async function getDealProducts(limit = 12): Promise<ProductCardData[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      primaryCategory: { isActive: true },
      compareAtPriceMinorUnits: { not: null },
    },
    include: productCardInclude,
  });
  return rows
    .map(toProductCard)
    .filter((p) => p.compareAtPriceMinorUnits !== null && p.compareAtPriceMinorUnits > p.priceMinorUnits)
    .sort((a, b) => discountRatio(b) - discountRatio(a))
    .slice(0, limit);
}

function discountRatio(p: ProductCardData) {
  return p.compareAtPriceMinorUnits ? (p.compareAtPriceMinorUnits - p.priceMinorUnits) / p.compareAtPriceMinorUnits : 0;
}

/** "Meilleures offres": a featured mix — discounted products first (best deal first), then the newest. */
export async function getFeaturedProducts(limit = 12): Promise<ProductCardData[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const rows = await prisma.product.findMany({
    where: { status: "PUBLISHED", primaryCategory: { isActive: true } },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit * 2,
    include: productCardInclude,
  });
  const cards = rows.map(toProductCard);
  const deals = cards.filter((p) => discountRatio(p) > 0).sort((a, b) => discountRatio(b) - discountRatio(a));
  const rest = cards.filter((p) => discountRatio(p) === 0);
  return [...deals, ...rest].slice(0, limit);
}

type ProductCardRow = Awaited<
  ReturnType<typeof prisma.product.findMany<{ include: typeof productCardInclude }>>
>[number];

function toProductCard(row: ProductCardRow): ProductCardData {
  return {
    id: row.id,
    slug: row.slug,
    name: row.translations[0]?.name ?? row.sku,
    brandName: row.brand?.isActive ? row.brand.name : null,
    priceMinorUnits: row.priceMinorUnits,
    compareAtPriceMinorUnits: row.compareAtPriceMinorUnits,
    imageUrl: row.images[0]?.url ?? null,
    imageAlt: row.images[0]?.alt ?? null,
    // Display only — checkout must always re-check live stock in the DB.
    inStock: (row.inventory?.stockQuantity ?? 0) - (row.inventory?.reservedQuantity ?? 0) > 0,
  };
}

/** Indexable URLs for sitemap.xml: published products + active categories, brands, promotions. */
export type SitemapEntry = { path: string; lastModified?: string };

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  try {
    const [products, categories, promotions, brands] = await Promise.all([
      prisma.product.findMany({
        where: { status: "PUBLISHED", primaryCategory: { isActive: true } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.promotion.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.brand.findMany({ where: { isActive: true }, select: { slug: true, products: { where: { status: "PUBLISHED" }, select: { id: true }, take: 1 } } }),
    ]);

    return [
      ...categories.map((c) => ({ path: `/categories/${c.slug}`, lastModified: c.updatedAt.toISOString() })),
      ...products.map((p) => ({ path: `/produits/${p.slug}`, lastModified: p.updatedAt.toISOString() })),
      ...promotions.map((p) => ({ path: `/promotions/${p.slug}`, lastModified: p.updatedAt.toISOString() })),
      // Only brands that actually have published products (an empty brand page is thin content).
      ...brands.filter((b) => b.products.length > 0).map((b) => ({ path: `/marques/${b.slug}` })),
    ];
  } catch {
    // The DB may be unreachable during a `next build` (e.g. in Docker). Fall back to
    // the static pages only; the full list fills in at runtime (cacheLife: hours).
    return [];
  }
}
