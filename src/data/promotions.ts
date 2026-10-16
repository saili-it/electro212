import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { CATALOG_TAG } from "@/lib/cache-tags";
import { ValidationError } from "@/lib/errors";
import { HERO_IMAGE_RULES, newStorageKey, processUploadedImage } from "@/lib/image-processing";
import { getStorage } from "@/lib/storage";
import type { CategoryListingProduct } from "@/data/catalog";

/*
 * Promotions = curated promotional events (e.g. "Black Friday"). An admin picks
 * products by hand; the storefront shows them together on /promotions/[slug].
 * Prices are NOT changed here — any discount is each product's own compareAtPrice.
 * Image handling mirrors banners (upload first, then write the row).
 */

const MANAGERS = ["SUPER_ADMIN", "CATALOG_MANAGER"] as const;

const promotionInputSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est requis").max(120),
    slug: z.string().trim().min(1, "L'adresse est requise").max(160),
    subtitle: z.string().trim().max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    startsAt: z.date().nullable(),
    endsAt: z.date().nullable(),
    position: z.number().int().min(0).max(999).default(0),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt, {
    message: "La date de fin doit être après la date de début",
    path: ["endsAt"],
  });

export type PromotionInput = z.input<typeof promotionInputSchema>;

export type PromotionStatus = "active" | "scheduled" | "expired" | "inactive";

/** Pure visibility state, same rules as banners. */
export function promotionStatus(
  promo: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now = new Date(),
): PromotionStatus {
  if (!promo.isActive) return "inactive";
  if (promo.endsAt && promo.endsAt <= now) return "expired";
  if (promo.startsAt && promo.startsAt > now) return "scheduled";
  return "active";
}

// ---------- Admin reads ----------

export async function listPromotions() {
  await requireAdmin();
  const rows = await prisma.promotion.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { products: true } } },
  });
  const now = new Date();
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    isActive: row.isActive,
    position: row.position,
    productCount: row._count.products,
    status: promotionStatus(row, now),
  }));
}

export async function getPromotion(id: string) {
  await requireAdmin();
  const promo = await prisma.promotion.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              status: true,
              translations: { where: { locale: DEFAULT_LOCALE }, select: { name: true } },
              images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });
  if (!promo) return null;

  return {
    id: promo.id,
    slug: promo.slug,
    title: promo.title,
    subtitle: promo.subtitle,
    description: promo.description,
    heroImageUrl: promo.heroImageUrl,
    startsAt: promo.startsAt,
    endsAt: promo.endsAt,
    isActive: promo.isActive,
    position: promo.position,
    products: promo.products.map((pp) => ({
      productId: pp.productId,
      position: pp.position,
      name: pp.product.translations[0]?.name ?? pp.product.sku,
      sku: pp.product.sku,
      status: pp.product.status,
      imageUrl: pp.product.images[0]?.url ?? null,
    })),
  };
}

/** Products an admin can add to a promotion (everything but archived). */
export async function getPromotionProductOptions() {
  await requireAdmin();
  const rows = await prisma.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      sku: true,
      status: true,
      translations: { where: { locale: DEFAULT_LOCALE }, select: { name: true } },
    },
  });
  return rows.map((row) => ({ id: row.id, sku: row.sku, status: row.status, name: row.translations[0]?.name ?? row.sku }));
}

// ---------- Admin mutations ----------

async function storeHeroImage(image: File | Buffer) {
  const processed = await processUploadedImage(image, HERO_IMAGE_RULES);
  const key = newStorageKey("promotions", processed.ext);
  const { url } = await getStorage().put(key, processed.buffer, processed.contentType);
  return { key, url, width: processed.width, height: processed.height };
}

async function deleteImageQuietly(key: string | null) {
  if (!key) return;
  try {
    await getStorage().delete(key);
  } catch (error) {
    console.error(`Could not delete stored image ${key}`, error);
  }
}

export async function createPromotion(input: PromotionInput, image: File | Buffer | null) {
  await requireAdmin([...MANAGERS]);
  const data = promotionInputSchema.parse(input);

  const stored = image ? await storeHeroImage(image) : null;
  try {
    return await prisma.promotion.create({
      data: {
        title: data.title,
        slug: data.slug,
        subtitle: data.subtitle || null,
        description: data.description || null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        position: data.position,
        ...(stored
          ? { heroImageKey: stored.key, heroImageUrl: stored.url, heroImageWidth: stored.width, heroImageHeight: stored.height }
          : {}),
      },
    });
  } catch (error) {
    if (stored) await deleteImageQuietly(stored.key);
    throw error;
  }
}

export async function updatePromotion(id: string, input: PromotionInput, image: File | Buffer | null) {
  await requireAdmin([...MANAGERS]);
  const data = promotionInputSchema.parse(input);
  const existing = await prisma.promotion.findUnique({ where: { id }, select: { heroImageKey: true } });
  if (!existing) throw new ValidationError("Promotion introuvable.");

  const stored = image ? await storeHeroImage(image) : null;
  try {
    const promo = await prisma.promotion.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        subtitle: data.subtitle || null,
        description: data.description || null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        position: data.position,
        ...(stored
          ? { heroImageKey: stored.key, heroImageUrl: stored.url, heroImageWidth: stored.width, heroImageHeight: stored.height }
          : {}),
      },
    });
    if (stored) await deleteImageQuietly(existing.heroImageKey);
    return promo;
  } catch (error) {
    if (stored) await deleteImageQuietly(stored.key);
    throw error;
  }
}

export async function setPromotionActive(id: string, isActive: boolean) {
  await requireAdmin([...MANAGERS]);
  await prisma.promotion.update({ where: { id }, data: { isActive } });
  return { ok: true as const };
}

export async function deletePromotion(id: string) {
  await requireAdmin([...MANAGERS]);
  const promo = await prisma.promotion.delete({ where: { id } }); // PromotionProduct rows cascade
  await deleteImageQuietly(promo.heroImageKey);
  return { ok: true as const };
}

export async function addPromotionProduct(promotionId: string, productId: string) {
  await requireAdmin([...MANAGERS]);
  const agg = await prisma.promotionProduct.aggregate({ where: { promotionId }, _max: { position: true } });
  const position = (agg._max.position ?? -1) + 1;
  try {
    await prisma.promotionProduct.create({ data: { promotionId, productId, position } });
  } catch (error) {
    // Already in the promotion — treat as a no-op.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  return { ok: true as const };
}

export async function removePromotionProduct(promotionId: string, productId: string) {
  await requireAdmin([...MANAGERS]);
  await prisma.promotionProduct.deleteMany({ where: { promotionId, productId } });
  return { ok: true as const };
}

export async function movePromotionProduct(promotionId: string, productId: string, direction: "up" | "down") {
  await requireAdmin([...MANAGERS]);
  const rows = await prisma.promotionProduct.findMany({ where: { promotionId }, orderBy: { position: "asc" } });
  const index = rows.findIndex((r) => r.productId === productId);
  if (index === -1) return { ok: true as const };
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return { ok: true as const };

  const a = rows[index];
  const b = rows[swapIndex];
  await prisma.$transaction([
    prisma.promotionProduct.update({
      where: { promotionId_productId: { promotionId, productId: a.productId } },
      data: { position: b.position },
    }),
    prisma.promotionProduct.update({
      where: { promotionId_productId: { promotionId, productId: b.productId } },
      data: { position: a.position },
    }),
  ]);
  return { ok: true as const };
}

// ---------- Storefront (public, cached) ----------

export type PromotionCard = {
  slug: string;
  title: string;
  subtitle: string | null;
  heroImageUrl: string | null;
  endsAtMs: number | null;
  productCount: number;
};

/** Live, visible promotions for the /promotions index. */
export async function getActivePromotions(): Promise<PromotionCard[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const now = new Date();
  const rows = await prisma.promotion.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { products: { where: { product: { status: "PUBLISHED" } } } } } },
  });

  return rows
    .filter((row) => row._count.products > 0)
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      heroImageUrl: row.heroImageUrl,
      endsAtMs: row.endsAt?.getTime() ?? null,
      productCount: row._count.products,
    }));
}

export type PromotionPageData = {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroImageUrl: string | null;
  endsAtMs: number | null;
  products: CategoryListingProduct[];
};

/** A single promotion page with its PUBLISHED products in curated order. */
export async function getPromotionPageData(slug: string): Promise<PromotionPageData | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const now = new Date();
  const promo = await prisma.promotion.findFirst({
    where: {
      slug,
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: {
          product: {
            include: {
              translations: { where: { locale: DEFAULT_LOCALE } },
              brand: { select: { name: true, slug: true, isActive: true } },
              images: { orderBy: { position: "asc" }, take: 1 },
              inventory: { select: { stockQuantity: true, reservedQuantity: true } },
            },
          },
        },
      },
    },
  });
  if (!promo) return null;

  const products: CategoryListingProduct[] = promo.products
    .filter((pp) => pp.product.status === "PUBLISHED")
    .map((pp) => {
      const row = pp.product;
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

  return {
    slug: promo.slug,
    title: promo.title,
    subtitle: promo.subtitle,
    description: promo.description,
    heroImageUrl: promo.heroImageUrl,
    endsAtMs: promo.endsAt?.getTime() ?? null,
    products,
  };
}
