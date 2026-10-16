import "server-only";
import type { BannerPlacement } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/errors";
import { BANNER_PLACEMENT_RULES, newStorageKey, processUploadedImage } from "@/lib/image-processing";
import { getStorage } from "@/lib/storage";
import { isAllowedLink } from "@/lib/links";

const MANAGERS = ["SUPER_ADMIN", "CATALOG_MANAGER"] as const;

const bannerInputSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est requis").max(120),
    linkUrl: z
      .string()
      .trim()
      .min(1, "Le lien est requis")
      .max(500)
      .refine(isAllowedLink, "Lien invalide : utilisez une adresse du site (/categories/…) ou une URL https://"),
    ctaLabel: z.string().trim().max(30).optional(),
    footnote: z.string().trim().max(200).optional(),
    headline: z.string().trim().max(80).optional(),
    subtitle: z.string().trim().max(160).optional(),
    startsAt: z.date().nullable(),
    endsAt: z.date().nullable(),
    position: z.number().int().min(0).max(999).default(0),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt, {
    message: "La date de fin doit être après la date de début",
    path: ["endsAt"],
  });

export type BannerInput = z.input<typeof bannerInputSchema>;

export type BannerStatus = "active" | "scheduled" | "expired" | "inactive";

export function bannerStatus(
  banner: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now = new Date(),
): BannerStatus {
  if (!banner.isActive) return "inactive";
  if (banner.endsAt && banner.endsAt <= now) return "expired";
  if (banner.startsAt && banner.startsAt > now) return "scheduled";
  return "active";
}

export async function listBanners(placement: BannerPlacement) {
  await requireAdmin();
  const rows = await prisma.banner.findMany({
    where: { placement },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });
  const now = new Date();
  return rows.map((row) => ({ ...row, status: bannerStatus(row, now) }));
}

export async function getBanner(id: string) {
  await requireAdmin();
  return prisma.banner.findUnique({ where: { id } });
}

/** Uploads first, then writes the row; if the row fails, the orphan file is removed. */
async function storeImage(image: File | Buffer, placement: BannerPlacement) {
  const processed = await processUploadedImage(image, BANNER_PLACEMENT_RULES[placement]);
  const key = newStorageKey("banners", processed.ext);
  const { url } = await getStorage().put(key, processed.buffer, processed.contentType);
  return { key, url, width: processed.width, height: processed.height };
}

async function deleteImageQuietly(key: string) {
  try {
    await getStorage().delete(key);
  } catch (error) {
    // An orphaned file only wastes space; never fail the admin's action for it.
    console.error(`Could not delete stored image ${key}`, error);
  }
}

export async function createBanner(
  placement: BannerPlacement,
  input: BannerInput,
  image: File | Buffer | null,
) {
  await requireAdmin([...MANAGERS]);
  const data = bannerInputSchema.parse(input);
  if (!image) throw new ValidationError("Choisissez une image.", "image");

  const stored = await storeImage(image, placement);
  try {
    return await prisma.banner.create({
      data: {
        ...data,
        placement,
        ctaLabel: data.ctaLabel ?? "",
        footnote: data.footnote || null,
        headline: data.headline || null,
        subtitle: data.subtitle || null,
        imageKey: stored.key,
        imageUrl: stored.url,
        imageWidth: stored.width,
        imageHeight: stored.height,
      },
    });
  } catch (error) {
    await deleteImageQuietly(stored.key);
    throw error;
  }
}

export async function updateBanner(id: string, input: BannerInput, image: File | Buffer | null) {
  await requireAdmin([...MANAGERS]);
  const data = bannerInputSchema.parse(input);
  const existing = await prisma.banner.findUnique({ where: { id }, select: { imageKey: true, placement: true } });
  if (!existing) throw new ValidationError("Bannière introuvable.");

  // Placement never changes after creation, so image rules stay consistent.
  const stored = image ? await storeImage(image, existing.placement) : null;
  try {
    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...data,
        ctaLabel: data.ctaLabel ?? "",
        footnote: data.footnote || null,
        headline: data.headline || null,
        subtitle: data.subtitle || null,
        ...(stored
          ? { imageKey: stored.key, imageUrl: stored.url, imageWidth: stored.width, imageHeight: stored.height }
          : {}),
      },
    });
    // The old file is only removed once the row points at the new one.
    if (stored) await deleteImageQuietly(existing.imageKey);
    return banner;
  } catch (error) {
    if (stored) await deleteImageQuietly(stored.key);
    throw error;
  }
}

export async function setBannerActive(id: string, isActive: boolean) {
  await requireAdmin([...MANAGERS]);
  await prisma.banner.update({ where: { id }, data: { isActive } });
  return { ok: true as const };
}

export async function deleteBanner(id: string) {
  await requireAdmin([...MANAGERS]);
  const banner = await prisma.banner.delete({ where: { id } });
  await deleteImageQuietly(banner.imageKey);
  return { ok: true as const };
}
