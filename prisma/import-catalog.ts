import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";

/*
 * Imports the real Electro212 catalogue (exported from WooCommerce) from
 * prisma/data/product-catalog.json, REPLACING the demo seed data.
 *
 * Destructive by design: it wipes the catalogue tables (products, categories,
 * brands, attributes) and rebuilds them from the JSON. Safe to run only while
 * there are no orders/stock movements (checked before wiping). Admin users,
 * banners and everything else are untouched. Re-runnable: each run wipes and
 * reloads, so it stays idempotent.
 *
 *   npm run db:import-catalog
 *
 * Product photos are NOT imported (set IMPORT_IMAGES = true to pull the
 * electro212.ma image URLs from the JSON); upload them from the admin instead.
 */

const IMPORT_IMAGES = false;

type WcCategory = { id: number; name: string; slug: string; parentId: number | null };
type WcImage = { url: string; alt: string | null };
type WcProduct = {
  id: number;
  sku: string | null;
  slug: string;
  name: string;
  descriptionHtml: string | null;
  shortDescriptionHtml: string | null;
  price: number | null;
  regularPrice: number | null;
  salePrice: number | null;
  stockStatus: string;
  categories: { id: number; name: string; slug: string }[];
  brands: string[];
  image: string | null;
  images: WcImage[];
  url: string;
};
type Catalog = { categories: WcCategory[]; products: WcProduct[] };

// The main-category tiles already shipped in public/categories/*.webp.
const MAIN_CATEGORY_IMAGE: Record<string, string> = {
  "television-et-accessoire-audio": "/categories/tv-et-accessoires.webp",
  "petit-electromenager": "/categories/petit-electromenager.webp",
  "gros-electromenager": "/categories/gros-electromenager.webp",
  "confort-de-la-maison": "/categories/confort-de-la-maison.webp",
  "meuble-tv": "/categories/meuble-tv.webp",
  encastrable: "/categories/encastrable.webp",
};

const toMinor = (mad: number) => Math.round(mad * 100);

const slugify = (input: string) =>
  input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

/** WooCommerce rich text → clean multi-line plain text (lists become "• " lines). */
function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let t = html;
  t = t.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  t = t.replace(/<\s*li[^>]*>/gi, "\n• ");
  t = t.replace(/<\/\s*(p|div|ul|ol|h[1-6]|li|tr|figure)\s*>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  t = decodeEntities(t);
  t = t.replace(/\r/g, "");
  t = t.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

async function wipeCatalogue() {
  const [orders, movements] = await Promise.all([prisma.orderItem.count(), prisma.stockMovement.count()]);
  if (orders > 0 || movements > 0) {
    throw new Error("Des commandes/mouvements de stock existent : import destructif refusé. Archivez-les d'abord.");
  }

  // Products first (cascades translations, images, attribute values, inventory, product-category links).
  await prisma.product.deleteMany({});
  await prisma.categoryAttribute.deleteMany({});
  await prisma.attribute.deleteMany({});
  await prisma.categoryTranslation.deleteMany({});

  // Categories are self-referencing: delete leaves first, up to the roots.
  for (let guard = 0; guard < 20; guard += 1) {
    const rows = await prisma.category.findMany({ select: { id: true, parentId: true } });
    if (rows.length === 0) break;
    const parents = new Set(rows.map((r) => r.parentId).filter((id): id is string => id !== null));
    const leaves = rows.filter((r) => !parents.has(r.id)).map((r) => r.id);
    if (leaves.length === 0) throw new Error("Cycle inattendu dans l'arbre des catégories.");
    await prisma.category.deleteMany({ where: { id: { in: leaves } } });
  }

  await prisma.brand.deleteMany({});
}

async function importBrands(products: WcProduct[]) {
  const names = [...new Set(products.flatMap((p) => p.brands).filter(Boolean))];
  const byName = new Map<string, string>();
  for (const name of names) {
    const brand = await prisma.brand.create({ data: { name, slug: slugify(name) } });
    byName.set(name, brand.id);
  }
  return byName;
}

async function importCategories(categories: WcCategory[]) {
  const dbIdByWcId = new Map<number, string>();
  const depthByWcId = new Map<number, number>();
  const positionByParent = new Map<number | null, number>();

  // Input is ordered parents-before-children, so a single pass resolves parents.
  for (const cat of categories) {
    const parentDbId = cat.parentId !== null ? (dbIdByWcId.get(cat.parentId) ?? null) : null;
    const depth = cat.parentId !== null ? (depthByWcId.get(cat.parentId) ?? 0) + 1 : 0;
    depthByWcId.set(cat.id, depth);

    const position = positionByParent.get(cat.parentId) ?? 0;
    positionByParent.set(cat.parentId, position + 1);

    const imageUrl = depth === 0 ? (MAIN_CATEGORY_IMAGE[cat.slug] ?? null) : null;

    const row = await prisma.category.create({
      data: {
        slug: cat.slug,
        position,
        parentId: parentDbId,
        imageUrl,
        isActive: true,
        translations: { create: { locale: "fr", name: cat.name } },
      },
    });
    dbIdByWcId.set(cat.id, row.id);
  }

  return { dbIdByWcId, depthByWcId };
}

async function importProducts(
  products: WcProduct[],
  brandIdByName: Map<string, string>,
  dbIdByWcId: Map<number, string>,
  depthByWcId: Map<number, number>,
) {
  const usedSkus = new Set<string>();
  const usedSlugs = new Set<string>();
  let published = 0;
  let draft = 0;
  let skipped = 0;

  const uniqueSku = (raw: string | null, wcId: number) => {
    const base = raw && raw.trim() ? raw.trim() : `WC-${wcId}`;
    let sku = base;
    let n = 2;
    while (usedSkus.has(sku)) sku = `${base}-${n++}`;
    usedSkus.add(sku);
    return sku;
  };

  const uniqueSlug = (name: string, sku: string) => {
    const base = slugify(name) || slugify(sku);
    let slug = base;
    if (usedSlugs.has(slug)) slug = `${base}-${slugify(sku)}`;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${slugify(sku)}-${n++}`;
    usedSlugs.add(slug);
    return slug;
  };

  for (const p of products) {
    // Resolve this product's categories to our DB ids; primary = the deepest one.
    const resolved = p.categories
      .map((c) => ({ dbId: dbIdByWcId.get(c.id), depth: depthByWcId.get(c.id) ?? 0 }))
      .filter((c): c is { dbId: string; depth: number } => Boolean(c.dbId));
    if (resolved.length === 0) {
      console.warn(`Produit ignoré (aucune catégorie connue): ${p.sku ?? p.id} — ${p.name}`);
      skipped += 1;
      continue;
    }
    resolved.sort((a, b) => b.depth - a.depth);
    const primaryCategoryId = resolved[0].dbId;
    const secondaryIds = [...new Set(resolved.slice(1).map((c) => c.dbId))].filter((id) => id !== primaryCategoryId);

    // Price: current = sale ?? price ?? regular; strike-through = regular when higher.
    const regular = p.regularPrice ?? p.price;
    const current = p.salePrice ?? p.price ?? p.regularPrice;
    const hasPrice = current !== null && current !== undefined;
    const priceMinorUnits = hasPrice ? toMinor(current as number) : 0;
    const compareAtPriceMinorUnits =
      hasPrice && regular !== null && regular !== undefined && regular > (current as number) ? toMinor(regular) : null;

    const status = hasPrice ? "PUBLISHED" : "DRAFT";
    const stockQuantity = p.stockStatus === "instock" ? 15 : 0;

    const sku = uniqueSku(p.sku, p.id);
    const slug = uniqueSlug(p.name, sku);
    const brandId = p.brands[0] ? (brandIdByName.get(p.brands[0]) ?? null) : null;

    const description = htmlToText(p.descriptionHtml) || null;
    const shortDescription = htmlToText(p.shortDescriptionHtml) || null;

    const images =
      IMPORT_IMAGES && p.images.length > 0
        ? p.images.map((img, i) => ({ url: img.url, alt: img.alt ?? p.name, position: i }))
        : [];

    await prisma.product.create({
      data: {
        sku,
        slug,
        brandId,
        primaryCategoryId,
        priceMinorUnits,
        compareAtPriceMinorUnits,
        currency: "MAD",
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        translations: { create: { locale: "fr", name: p.name, description, shortDescription } },
        inventory: { create: { stockQuantity } },
        categories: secondaryIds.length > 0 ? { create: secondaryIds.map((categoryId) => ({ categoryId })) } : undefined,
        images: images.length > 0 ? { create: images } : undefined,
      },
    });

    if (status === "PUBLISHED") published += 1;
    else draft += 1;
  }

  return { published, draft, skipped };
}

async function main() {
  const file = join(process.cwd(), "prisma", "data", "product-catalog.json");
  let catalog: Catalog;
  try {
    catalog = JSON.parse(readFileSync(file, "utf8")) as Catalog;
  } catch {
    throw new Error(
      `Fichier introuvable ou invalide : ${file}\nEnregistrez le catalogue JSON à cet emplacement, puis relancez \`npm run db:import-catalog\`.`,
    );
  }

  console.log(`Catalogue chargé : ${catalog.categories.length} catégories, ${catalog.products.length} produits.`);
  await wipeCatalogue();
  const brandIdByName = await importBrands(catalog.products);
  const { dbIdByWcId, depthByWcId } = await importCategories(catalog.categories);
  const { published, draft, skipped } = await importProducts(catalog.products, brandIdByName, dbIdByWcId, depthByWcId);

  console.log(
    `Import OK — marques: ${brandIdByName.size}, catégories: ${dbIdByWcId.size}, ` +
      `produits publiés: ${published}, brouillons (sans prix): ${draft}, ignorés: ${skipped}. Images: ${IMPORT_IMAGES ? "importées" : "non importées"}.`,
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
