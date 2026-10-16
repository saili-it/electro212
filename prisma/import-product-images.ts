import "dotenv/config";
import { readFileSync } from "node:fs";
import { basename, join, sep } from "node:path";
import { prisma } from "../src/lib/prisma";
// Use the local adapter directly: it's dependency-light (no `server-only`), so it
// runs under tsx. For an S3 prod bucket, set STORAGE_* and run on the server, or
// adapt this to getStorage().
import { localStorageAdapter } from "../src/lib/storage/local";
import { PRODUCT_IMAGE_RULES, newStorageKey, processUploadedImage } from "../src/lib/image-processing";

/*
 * Attaches the real product photos (folder `product-images/`, indexed by
 * `product-image-map.json`) to the catalogue products — matched by SKU.
 *
 * Each image is validated (sharp magic-byte sniff + decompression-bomb guard),
 * re-encoded to WebP (which also strips EXIF), resized to a sensible max width,
 * stored on disk via the local storage adapter (served by /uploads with a
 * 1-year immutable cache), and recorded as a ProductImage row (url + alt +
 * position). Idempotent: a product's existing images (rows + files) are removed
 * before its photos are (re-)imported.
 *
 *   npm run db:import-product-images
 */

type MapImage = { index: number; path: string; alt: string };
type MapProduct = { productId: number; sku: string | null; name: string; primaryImage: string; images: MapImage[] };
type ImageMap = { imageDirectory: string; products: MapProduct[] };

const ROOT = process.cwd();
const IMAGES_DIR = join(ROOT, "product-images");

/** Only files directly inside product-images/ — guards against path traversal in the map. */
function safeImagePath(p: string): string | null {
  const full = join(IMAGES_DIR, basename(p));
  return full === IMAGES_DIR || full.startsWith(IMAGES_DIR + sep) ? full : null;
}

/** "/uploads/products/<uuid>.webp" → "products/<uuid>.webp" */
function keyFromUrl(url: string): string | null {
  const m = /^\/uploads\/(.+)$/.exec(url);
  return m ? m[1] : null;
}

const skuKey = (p: MapProduct) => (p.sku && p.sku.trim() ? p.sku.trim() : `WC-${p.productId}`);
// Dash/encoding-insensitive key (the map mojibakes en-dashes the DB stores cleanly).
const norm = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase();

async function main() {
  const map: ImageMap = JSON.parse(readFileSync(join(ROOT, "product-image-map.json"), "utf8")) as ImageMap;

  // Load every product (small set) so the normalized fallback can match SKUs
  // whose separators/encoding differ between the map and the DB.
  const dbProducts = await prisma.product.findMany({
    select: { id: true, sku: true, translations: { where: { locale: "fr" }, select: { name: true } } },
  });
  const bySku = new Map(dbProducts.map((p) => [p.sku, p]));
  const byNorm = new Map(dbProducts.map((p) => [norm(p.sku), p]));

  let processed = 0;
  let created = 0;
  let missingFile = 0;
  let unmatched = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of map.products) {
    const product = bySku.get(skuKey(entry)) ?? byNorm.get(norm(skuKey(entry)));
    if (!product) {
      unmatched += 1;
      console.warn(`Produit introuvable pour la clé ${skuKey(entry)} (${entry.name}).`);
      continue;
    }

    // Idempotency: drop any images this product already has (rows + stored files).
    const existing = await prisma.productImage.findMany({ where: { productId: product.id }, select: { url: true } });
    // Already fully imported — leave it untouched (fast, safe re-runs).
    if (existing.length > 0 && existing.length === entry.images.length) {
      skipped += 1;
      continue;
    }
    for (const img of existing) {
      const key = keyFromUrl(img.url);
      if (key) await localStorageAdapter.delete(key).catch(() => {});
    }
    if (existing.length > 0) await prisma.productImage.deleteMany({ where: { productId: product.id } });

    // Correct, UTF-8 alt text from our catalogue (the map's alt is mojibake-encoded).
    const alt = product.translations[0]?.name ?? entry.name;

    let position = 0;
    for (const im of [...entry.images].sort((a, b) => a.index - b.index)) {
      processed += 1;
      const full = safeImagePath(im.path);
      if (!full) {
        console.warn(`Chemin d'image invalide: ${im.path}`);
        continue;
      }
      let raw: Buffer;
      try {
        raw = readFileSync(full);
      } catch {
        missingFile += 1;
        console.warn(`Fichier manquant: ${im.path}`);
        continue;
      }
      try {
        const img = await processUploadedImage(raw, PRODUCT_IMAGE_RULES, "product-image");
        const key = newStorageKey("products", img.ext);
        const { url } = await localStorageAdapter.put(key, img.buffer, img.contentType);
        await prisma.productImage.create({ data: { productId: product.id, url, alt, position } });
        position += 1;
        created += 1;
      } catch (error) {
        failed += 1;
        console.warn(`Échec image ${im.path}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  console.log(
    `Images produits — traitées: ${processed}, créées: ${created}, déjà à jour: ${skipped}, ` +
      `fichiers manquants: ${missingFile}, produits non appariés: ${unmatched}, échecs: ${failed}.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
