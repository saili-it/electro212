import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { AttributeDataType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { CATALOG_TAG } from "@/lib/cache-tags";
import type { FilterAttribute } from "@/lib/catalog-filters";
import type { ProductCardData } from "@/data/storefront";

export type CategoryListingProduct = ProductCardData & {
  brandSlug: string | null;
  publishedAtMs: number;
  attrs: Record<string, string>;
};

export type CategoryPageData = {
  id: string;
  slug: string;
  name: string;
  intro: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  breadcrumb: { slug: string; name: string }[];
  children: { slug: string; name: string }[];
  attributes: FilterAttribute[];
  products: CategoryListingProduct[];
};

function canonicalAttrValue(
  value: { valueText: string | null; valueNumber: unknown; valueBoolean: boolean | null },
  dataType: AttributeDataType,
): string | null {
  if (dataType === "BOOLEAN") return value.valueBoolean === null ? null : value.valueBoolean ? "true" : "false";
  if (dataType === "NUMBER") return value.valueNumber === null || value.valueNumber === undefined ? null : String(value.valueNumber);
  return value.valueText ?? null;
}

/** The category's own subtree ids (itself + all descendants), so a main category lists its sub-products. */
function descendantIds(categoryId: string, all: { id: string; parentId: string | null }[]): string[] {
  const ids = [categoryId];
  for (let i = 0; i < ids.length; i += 1) {
    for (const c of all) {
      if (c.parentId === ids[i] && !ids.includes(c.id)) ids.push(c.id);
    }
  }
  return ids;
}

/**
 * Everything a category page needs: meta, breadcrumb, sub-categories, the
 * filterable attributes (from the whole subtree), and the full set of
 * published products in the subtree. Filtering/sorting/paging happen in the
 * page from this cached base set, so filtered URLs don't re-hit the DB.
 */
export async function getCategoryPageData(slug: string): Promise<CategoryPageData | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const category = await prisma.category.findFirst({
    where: { slug, isActive: true },
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      parent: { include: { translations: { where: { locale: DEFAULT_LOCALE } } } },
      children: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }],
        include: { translations: { where: { locale: DEFAULT_LOCALE } } },
      },
    },
  });
  if (!category) return null;

  const allCategories = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const subtreeIds = descendantIds(category.id, allCategories);

  // Filterable, active attributes across the whole subtree, deduped by code, keeping the first position.
  const categoryAttributes = await prisma.categoryAttribute.findMany({
    where: { categoryId: { in: subtreeIds }, attribute: { isActive: true, isFilterable: true } },
    orderBy: [{ position: "asc" }],
    include: { attribute: true },
  });
  const attrByCode = new Map<string, FilterAttribute>();
  for (const ca of categoryAttributes) {
    if (!attrByCode.has(ca.attribute.code)) {
      attrByCode.set(ca.attribute.code, {
        code: ca.attribute.code,
        label: ca.attribute.label,
        dataType: ca.attribute.dataType,
        unit: ca.attribute.unit,
      });
    }
  }
  const attributes = [...attrByCode.values()];

  const rows = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ primaryCategoryId: { in: subtreeIds } }, { categories: { some: { categoryId: { in: subtreeIds } } } }],
    },
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      brand: { select: { name: true, slug: true, isActive: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
      inventory: { select: { stockQuantity: true, reservedQuantity: true } },
      attributeValues: { include: { attribute: { select: { code: true, dataType: true } } } },
    },
  });

  const products: CategoryListingProduct[] = rows.map((row) => {
    const attrs: Record<string, string> = {};
    for (const av of row.attributeValues) {
      const value = canonicalAttrValue(av, av.attribute.dataType);
      if (value !== null) attrs[av.attribute.code] = value;
    }
    const brandActive = row.brand?.isActive ?? false;
    return {
      id: row.id,
      slug: row.slug,
      name: row.translations[0]?.name ?? row.sku,
      brandName: brandActive ? (row.brand?.name ?? null) : null,
      brandSlug: brandActive ? (row.brand?.slug ?? null) : null,
      priceMinorUnits: row.priceMinorUnits,
      compareAtPriceMinorUnits: row.compareAtPriceMinorUnits,
      imageUrl: row.images[0]?.url ?? null,
      imageAlt: row.images[0]?.alt ?? null,
      inStock: (row.inventory?.stockQuantity ?? 0) - (row.inventory?.reservedQuantity ?? 0) > 0,
      publishedAtMs: (row.publishedAt ?? row.createdAt).getTime(),
      attrs,
    };
  });

  const fr = category.translations[0];
  const parentName = category.parent?.translations[0]?.name ?? category.parent?.slug;
  const breadcrumb = category.parent
    ? [{ slug: category.parent.slug, name: parentName ?? category.parent.slug }]
    : [];

  return {
    id: category.id,
    slug: category.slug,
    name: fr?.name ?? category.slug,
    intro: fr?.seoDescription ?? null,
    seoTitle: fr?.seoTitle ?? null,
    seoDescription: fr?.seoDescription ?? null,
    breadcrumb,
    children: category.children.map((c) => ({ slug: c.slug, name: c.translations[0]?.name ?? c.slug })),
    attributes,
    products,
  };
}

export type ProductSpec = { label: string; value: string };

export type ProductDetail = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: { name: string; slug: string } | null;
  description: string | null;
  shortDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  priceMinorUnits: number;
  compareAtPriceMinorUnits: number | null;
  currency: string;
  inStock: boolean;
  lowStock: boolean;
  availableStock: number;
  images: { url: string; alt: string }[];
  /** Category ancestors ending with the primary category (for the breadcrumb). */
  breadcrumb: { slug: string; name: string }[];
  specs: ProductSpec[];
  related: ProductCardData[];
};

/** A human spec value in French: booleans → Oui/Non, numbers keep their unit. */
function formatSpecValue(
  value: { valueText: string | null; valueNumber: unknown; valueBoolean: boolean | null },
  dataType: AttributeDataType,
  unit: string | null,
): string | null {
  if (dataType === "BOOLEAN") return value.valueBoolean === null ? null : value.valueBoolean ? "Oui" : "Non";
  if (dataType === "NUMBER") {
    if (value.valueNumber === null || value.valueNumber === undefined) return null;
    const n = String(value.valueNumber);
    return unit ? `${n} ${unit}` : n;
  }
  return value.valueText ?? null;
}

/**
 * Everything a product page needs: the published product (404 otherwise), its
 * images, specs, price/stock, category breadcrumb, and a few related products
 * from the same primary category. Cached and tagged like the rest of the
 * catalogue; admin writes expire CATALOG_TAG via refreshStorefront().
 */
export async function getProductDetail(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const product = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      brand: { select: { name: true, slug: true, isActive: true } },
      primaryCategory: {
        include: {
          translations: { where: { locale: DEFAULT_LOCALE } },
          parent: { include: { translations: { where: { locale: DEFAULT_LOCALE } } } },
        },
      },
      images: { orderBy: { position: "asc" } },
      inventory: { select: { stockQuantity: true, reservedQuantity: true, lowStockThreshold: true } },
      attributeValues: {
        include: { attribute: { select: { code: true, label: true, dataType: true, unit: true, isActive: true } } },
      },
    },
  });
  if (!product) return null;

  const fr = product.translations[0];

  const specs: ProductSpec[] = product.attributeValues
    .filter((av) => av.attribute.isActive)
    .map((av) => ({ label: av.attribute.label, value: formatSpecValue(av, av.attribute.dataType, av.attribute.unit) }))
    .filter((s): s is ProductSpec => s.value !== null)
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  // Breadcrumb: the main category (when the primary is a sub-category), then the primary itself.
  const cat = product.primaryCategory;
  const breadcrumb: { slug: string; name: string }[] = [];
  if (cat.parent) breadcrumb.push({ slug: cat.parent.slug, name: cat.parent.translations[0]?.name ?? cat.parent.slug });
  breadcrumb.push({ slug: cat.slug, name: cat.translations[0]?.name ?? cat.slug });

  const available = Math.max(0, (product.inventory?.stockQuantity ?? 0) - (product.inventory?.reservedQuantity ?? 0));

  const relatedRows = await prisma.product.findMany({
    where: { status: "PUBLISHED", primaryCategoryId: product.primaryCategoryId, id: { not: product.id } },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 10,
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      brand: { select: { name: true, isActive: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
      inventory: { select: { stockQuantity: true, reservedQuantity: true } },
    },
  });
  const related: ProductCardData[] = relatedRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.translations[0]?.name ?? row.sku,
    brandName: row.brand?.isActive ? row.brand.name : null,
    priceMinorUnits: row.priceMinorUnits,
    compareAtPriceMinorUnits: row.compareAtPriceMinorUnits,
    imageUrl: row.images[0]?.url ?? null,
    imageAlt: row.images[0]?.alt ?? null,
    inStock: (row.inventory?.stockQuantity ?? 0) - (row.inventory?.reservedQuantity ?? 0) > 0,
  }));

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: fr?.name ?? product.sku,
    brand: product.brand?.isActive ? { name: product.brand.name, slug: product.brand.slug } : null,
    description: fr?.description ?? null,
    shortDescription: fr?.shortDescription ?? null,
    seoTitle: fr?.seoTitle ?? null,
    seoDescription: fr?.seoDescription ?? null,
    priceMinorUnits: product.priceMinorUnits,
    compareAtPriceMinorUnits: product.compareAtPriceMinorUnits,
    currency: product.currency,
    inStock: available > 0,
    lowStock: available > 0 && available <= (product.inventory?.lowStockThreshold ?? 0),
    availableStock: available,
    images: product.images.map((img) => ({ url: img.url, alt: img.alt ?? fr?.name ?? product.sku })),
    breadcrumb,
    specs,
    related,
  };
}

/** Lowercase + strip accents, so "refrigerateur" matches "Réfrigérateur". */
function normalizeSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Free-text search over published products: accent-insensitive, multi-word
 * (every term must appear), matched against name + SKU + brand. Not cached —
 * the query is user input (unbounded keys); the catalogue is small enough to
 * filter in memory.
 */
export async function getSearchResults(query: string): Promise<CategoryListingProduct[]> {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: { status: "PUBLISHED", primaryCategory: { isActive: true } },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      brand: { select: { name: true, slug: true, isActive: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
      inventory: { select: { stockQuantity: true, reservedQuantity: true } },
    },
  });

  return rows
    .filter((row) => {
      const name = row.translations[0]?.name ?? row.sku;
      const brand = row.brand?.isActive ? (row.brand?.name ?? "") : "";
      const haystack = normalizeSearch(`${name} ${row.sku} ${brand}`);
      return terms.every((t) => haystack.includes(t));
    })
    .map((row) => {
      const brandActive = row.brand?.isActive ?? false;
      return {
        id: row.id,
        slug: row.slug,
        name: row.translations[0]?.name ?? row.sku,
        brandName: brandActive ? (row.brand?.name ?? null) : null,
        brandSlug: brandActive ? (row.brand?.slug ?? null) : null,
        priceMinorUnits: row.priceMinorUnits,
        compareAtPriceMinorUnits: row.compareAtPriceMinorUnits,
        imageUrl: row.images[0]?.url ?? null,
        imageAlt: row.images[0]?.alt ?? null,
        inStock: (row.inventory?.stockQuantity ?? 0) - (row.inventory?.reservedQuantity ?? 0) > 0,
        publishedAtMs: (row.publishedAt ?? row.createdAt).getTime(),
        attrs: {},
      };
    });
}

/** Slugs for generateStaticParams (active categories). */
export async function getAllCategorySlugs(): Promise<string[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const rows = await prisma.category.findMany({ where: { isActive: true }, select: { slug: true } });
  return rows.map((r) => r.slug);
}

export type BrandPageData = {
  slug: string;
  name: string;
  logoUrl: string | null;
  products: CategoryListingProduct[];
};

/** A brand landing page: the brand plus all its published products. */
export async function getBrandPageData(slug: string): Promise<BrandPageData | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const brand = await prisma.brand.findFirst({
    where: { slug, isActive: true },
    select: { name: true, slug: true, logoUrl: true },
  });
  if (!brand) return null;

  const rows = await prisma.product.findMany({
    where: { brand: { slug, isActive: true }, status: "PUBLISHED", primaryCategory: { isActive: true } },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      brand: { select: { name: true, slug: true, isActive: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
      inventory: { select: { stockQuantity: true, reservedQuantity: true } },
    },
  });

  const products: CategoryListingProduct[] = rows.map((row) => {
    const brandActive = row.brand?.isActive ?? false;
    return {
      id: row.id,
      slug: row.slug,
      name: row.translations[0]?.name ?? row.sku,
      brandName: brandActive ? (row.brand?.name ?? null) : null,
      brandSlug: brandActive ? (row.brand?.slug ?? null) : null,
      priceMinorUnits: row.priceMinorUnits,
      compareAtPriceMinorUnits: row.compareAtPriceMinorUnits,
      imageUrl: row.images[0]?.url ?? null,
      imageAlt: row.images[0]?.alt ?? null,
      inStock: (row.inventory?.stockQuantity ?? 0) - (row.inventory?.reservedQuantity ?? 0) > 0,
      publishedAtMs: (row.publishedAt ?? row.createdAt).getTime(),
      attrs: {},
    };
  });

  return { slug: brand.slug, name: brand.name, logoUrl: brand.logoUrl, products };
}
