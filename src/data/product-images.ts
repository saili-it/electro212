import "server-only";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";
import { newStorageKey, PRODUCT_IMAGE_RULES, processUploadedImage } from "@/lib/image-processing";
import { ValidationError } from "@/lib/errors";

const ROLES = ["SUPER_ADMIN", "CATALOG_MANAGER"] as const;
const MAX_IMAGES_PER_PRODUCT = 12;

export type AddImagesResult = { added: number; skipped: { name: string; reason: string }[]; error?: string };

/** Derive the storage key from a stored ProductImage url (local `/uploads/<key>` or an S3/CDN url). */
function keyFromUrl(url: string): string | null {
  const local = /^\/uploads\/(.+)$/.exec(url);
  if (local) return local[1];
  const base = process.env.STORAGE_PUBLIC_CDN_URL?.replace(/\/+$/, "");
  if (base && url.startsWith(`${base}/`)) return url.slice(base.length + 1);
  return null;
}

async function deleteStoredQuietly(url: string) {
  const key = keyFromUrl(url);
  if (!key) return;
  try {
    await getStorage().delete(key);
  } catch (err) {
    console.error(`Could not delete stored product image ${key}`, err);
  }
}

/** Upload one or more photos, append them after the product's existing images (WebP, validated). */
export async function addProductImages(productId: string, files: File[]): Promise<AddImagesResult> {
  await requireAdmin([...ROLES]);

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return { added: 0, skipped: [], error: "Produit introuvable." };

  const incoming = files.filter((f) => f instanceof File && f.size > 0);
  if (incoming.length === 0) return { added: 0, skipped: [], error: "Aucune image sélectionnée." };

  const current = await prisma.productImage.count({ where: { productId } });
  if (current + incoming.length > MAX_IMAGES_PER_PRODUCT) {
    return { added: 0, skipped: [], error: `Maximum ${MAX_IMAGES_PER_PRODUCT} images par produit (${current} déjà présentes).` };
  }

  const storage = getStorage();
  const skipped: { name: string; reason: string }[] = [];
  let position = current;
  let added = 0;

  for (const file of incoming) {
    try {
      const processed = await processUploadedImage(file, PRODUCT_IMAGE_RULES, "image");
      const key = newStorageKey("products", processed.ext);
      const { url } = await storage.put(key, processed.buffer, processed.contentType);
      await prisma.productImage.create({ data: { productId, url, position } });
      position += 1;
      added += 1;
    } catch (err) {
      const reason = err instanceof ValidationError ? err.message : "Image invalide.";
      skipped.push({ name: file.name, reason });
    }
  }

  if (added === 0) return { added: 0, skipped, error: skipped[0]?.reason ?? "Aucune image ajoutée." };
  return { added, skipped };
}

/** Delete one image (row + stored file). */
export async function deleteProductImage(imageId: string): Promise<{ ok: true } | { error: string }> {
  await requireAdmin([...ROLES]);
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return { error: "Image introuvable." };
  await prisma.productImage.delete({ where: { id: imageId } });
  await deleteStoredQuietly(image.url);
  return { ok: true };
}

/** Persist a new order: each id's position becomes its index in `orderedIds`. */
export async function reorderProductImages(productId: string, orderedIds: string[]): Promise<{ ok: true } | { error: string }> {
  await requireAdmin([...ROLES]);
  const images = await prisma.productImage.findMany({ where: { productId }, select: { id: true } });
  const owned = new Set(images.map((i) => i.id));
  const next = orderedIds.filter((id) => owned.has(id));
  if (next.length !== images.length) return { error: "Liste d'images invalide." };

  await prisma.$transaction(next.map((id, index) => prisma.productImage.update({ where: { id }, data: { position: index } })));
  return { ok: true };
}

/** Update one image's alt text. */
export async function updateProductImageAlt(imageId: string, alt: string): Promise<{ ok: true } | { error: string }> {
  await requireAdmin([...ROLES]);
  await prisma.productImage.update({ where: { id: imageId }, data: { alt: alt.trim() || null } });
  return { ok: true };
}
