import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import JSZip from "jszip";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
// Local adapter directly (no `server-only`, runs under tsx) — same as import-product-images.ts.
import { localStorageAdapter } from "../src/lib/storage/local";
import { PRODUCT_IMAGE_RULES, newStorageKey, processUploadedImage } from "../src/lib/image-processing";

/*
 * Rebuilds the catalogue from the stock workbook
 * (prisma/data/Stock_Electronique_par_Categorie_et_Marque.xlsx, sheet "Produits électroniques").
 *
 * The workbook is the source of truth:
 *   - Categories: the Univers > Catégorie > Sous-catégorie tree REPLACES the old tree
 *     (rows with a matching slug are reused so their images/links survive; the rest is deleted).
 *   - Products: every row is (re)built from the file — title, description, category, brand, stock.
 *     Products absent from the file are deleted (or ARCHIVED when an order/stock movement references them).
 *   - Brands: matched by name (accent/case-insensitive, existing logos kept); "Non précisée" = no brand;
 *     brands left without products are removed.
 *   - Images: the thumbnails embedded in the sheet are attached to products that have no photo.
 *
 * The file has NO prices. With KEEP_EXISTING_PRICES_AND_PHOTOS, a product whose SKU already exists keeps its
 * price and photos (published if priced); new products are DRAFT (hidden) until a price is set in the admin.
 *
 *   npm run db:import-stock-catalog -- --dry-run      # show what would change, write nothing
 *   npm run db:import-stock-catalog                   # apply
 *   npm run db:import-stock-catalog -- path/to/file.xlsx
 *   npm run db:import-stock-catalog -- --refresh-hd-images   # also swap current photos for prisma/data/product-images-hd
 *
 * Re-runnable. Restart the app afterwards so cached storefront pages pick up the new catalogue.
 */

const KEEP_EXISTING_PRICES_AND_PHOTOS = true;
const DEFAULT_FILE = join(process.cwd(), "prisma", "data", "Stock_Electronique_par_Categorie_et_Marque.xlsx");
const PRODUCT_SHEET = "Produits électroniques";
// AI-upscaled (Real-ESRGAN x4) versions of the sheet's thumbnails, "<SKU>__<position>.webp"; used instead of them.
const HD_IMAGES_DIR = join(process.cwd(), "prisma", "data", "product-images-hd");
const NO_BRAND = new Set(["", "non precisee", "non precise", "inconnue"]);

// Univers from the file → what the site uses. A string renames the univers or merges its categories into
// another univers (same name = merge); null drops the univers and its products.
const UNIVERS_REMAP: Record<string, string | null> = {
  "Santé - Beauté - Bébé": "Confort de la maison",
  "Entretien de la maison": "Petit electroménager",
  "TV - Photo - Video": "TV et accessoires",
  Informatique: null,
};

// Sub-categories merged together: "Catégorie > Sous-catégorie" (as in the file) → merged sub-category name.
const SUBCATEGORY_MERGE: Record<string, string> = {
  "Réfrigérateur > Mini bar": "Petit réfrigérateur",
  "Accessoires TV-Video > Télécommande TV": "Télécommandes",
  "Accessoires TV-Video > Télécommande récepteur": "Télécommandes",
  "Téléviseur > QLED": "QLED et Mini LED",
  "Téléviseur > MiniLED- NeoQLED-QNED": "QLED et Mini LED",
};

// A sub-category is kept only with at least this many products, and only while its category keeps at least
// 2 such sub-categories; otherwise those products sit directly in the category (no near-empty pages).
const MIN_SUBCATEGORY_PRODUCTS = 3;

// Slugs the site already links to (home hero, inspiration tiles), keyed by "Univers > Catégorie[ > Sous-catégorie]"
// (univers names after UNIVERS_REMAP).
const SLUG_OVERRIDES: Record<string, string> = {
  "TV et accessoires > Téléviseur": "televiseurs",
  "Confort de la maison > Climatisation > Climatiseur": "climatiseurs",
};

// Tile images shipped in public/categories.
const CATEGORY_IMAGE: Record<string, string> = {
  "gros-electromenager": "/categories/gros-electromenager.webp",
  "petit-electromenager": "/categories/petit-electromenager.webp",
  "confort-de-la-maison": "/categories/confort-de-la-maison.webp",
  "tv-et-accessoires": "/categories/tv-et-accessoires.webp",
  encastrable: "/categories/encastrable.webp",
};

// Banner links to old category pages that no longer exist → their new equivalent.
const BANNER_LINK_REWRITES: Record<string, string> = {
  "/categories/televisions-smart": "/categories/smart-tv",
  "/categories/television-et-accessoire-audio": "/categories/tv-et-accessoires",
  "/categories/tv-photo-video": "/categories/tv-et-accessoires",
};

// ---------------------------------------------------------------- helpers

const slugify = (input: string) =>
  input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const fold = (s: string) => slugify(s).replace(/-/g, " ");
const skuKey = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase();
const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** Drops working notes like "(nb de feux à préciser)" from category names. */
const cleanCategoryName = (s: string) => clean(s.replace(/\s*\([^)]*(?:pr[ée]ciser|confirmer)[^)]*\)/gi, ""));

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).replace(/[\s,.;:–-]+$/, "")}…`;
}

function decodeXml(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const attrs = (s: string) => Object.fromEntries([...s.matchAll(/([\w:]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const textRuns = (xml: string) => [...xml.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => decodeXml(m[1])).join("");
const colIndex = (ref: string) => [...ref.replace(/\d+/g, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

// ---------------------------------------------------------------- minimal xlsx reader
// (exceljs crashes on this workbook's absolute relationship targets; this handles both styles.)

type Sheet = { rows: Map<number, string[]>; images: Map<number, { col: number; data: Buffer }[]> };

async function readPart(zip: JSZip, path: string) {
  const file = zip.file(path);
  return file ? file.async("string") : null;
}

async function readRels(zip: JSZip, partPath: string) {
  const relsPath = posix.join(posix.dirname(partPath), "_rels", `${posix.basename(partPath)}.rels`);
  const xml = (await readPart(zip, relsPath)) ?? "";
  const map = new Map<string, { type: string; target: string }>();
  for (const m of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const a = attrs(m[1]);
    const target = a.Target.startsWith("/") ? a.Target.slice(1) : posix.normalize(posix.join(posix.dirname(partPath), a.Target));
    map.set(a.Id, { type: a.Type, target });
  }
  return map;
}

async function readSheet(file: string, wantedName: string): Promise<Sheet> {
  const zip = await JSZip.loadAsync(readFileSync(file));

  const sharedXml = (await readPart(zip, "xl/sharedStrings.xml")) ?? "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textRuns(m[1]));

  const workbookXml = (await readPart(zip, "xl/workbook.xml")) ?? "";
  const wbRels = await readRels(zip, "xl/workbook.xml");
  const sheets = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)].map((m) => {
    const a = attrs(m[1]);
    return { name: decodeXml(a.name), path: wbRels.get(a["r:id"])?.target ?? "" };
  });
  const sheet = sheets.find((s) => s.name === wantedName) ?? sheets.find((s) => fold(s.name) === fold(wantedName));
  if (!sheet) throw new Error(`Onglet « ${wantedName} » introuvable (onglets : ${sheets.map((s) => s.name).join(", ")}).`);

  const xml = (await readPart(zip, sheet.path)) ?? "";
  const sheetData = /<sheetData>([\s\S]*?)<\/sheetData>/.exec(xml)?.[1] ?? "";
  const rows = new Map<number, string[]>();
  for (const rm of sheetData.matchAll(/<row\b([^>]*?)>([\s\S]*?)<\/row>/g)) {
    const rowNo = Number(attrs(rm[1]).r);
    const cells: string[] = [];
    for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = attrs(cm[1]);
      const body = cm[2] ?? "";
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = "";
      if (a.t === "s") value = shared[Number(v)] ?? "";
      else if (a.t === "inlineStr") value = textRuns(body);
      else if (v !== undefined) value = decodeXml(v);
      cells[colIndex(a.r)] = value;
    }
    rows.set(rowNo, cells);
  }

  // Embedded pictures, keyed by the (1-based) row of their top-left anchor.
  const images = new Map<number, { col: number; data: Buffer }[]>();
  for (const rel of (await readRels(zip, sheet.path)).values()) {
    if (!rel.type.endsWith("/drawing")) continue;
    const drawingXml = (await readPart(zip, rel.target)) ?? "";
    const drawingRels = await readRels(zip, rel.target);
    const anchorRe = /<(?:\w+:)?(?:twoCellAnchor|oneCellAnchor)\b[\s\S]*?<\/(?:\w+:)?(?:twoCellAnchor|oneCellAnchor)>/g;
    for (const am of drawingXml.matchAll(anchorRe)) {
      const from = /<(?:\w+:)?from>([\s\S]*?)<\/(?:\w+:)?from>/.exec(am[0])?.[1] ?? "";
      const col = Number(/<(?:\w+:)?col>(\d+)</.exec(from)?.[1]);
      const row = Number(/<(?:\w+:)?row>(\d+)</.exec(from)?.[1]) + 1;
      const embed = /r:embed="([^"]+)"/.exec(am[0])?.[1];
      const media = embed ? drawingRels.get(embed)?.target : undefined;
      const file = media ? zip.file(media) : null;
      if (!file || Number.isNaN(row)) continue;
      const list = images.get(row) ?? [];
      list.push({ col, data: await file.async("nodebuffer") });
      images.set(row, list);
    }
  }
  for (const list of images.values()) list.sort((a, b) => a.col - b.col);

  return { rows, images };
}

// ---------------------------------------------------------------- workbook → catalogue model

type Row = {
  rowNo: number;
  merged: boolean; // univers was merged into another one (its categories go after the target's own)
  path: string[]; // [univers, catégorie, sous-catégorie?] (cleaned; a sub-category equal to its category is folded)
  brand: string | null;
  sku: string;
  title: string;
  description: string | null;
  stock: number;
  images: Buffer[];
};

const HEADERS = {
  univers: "Univers",
  categorie: "Catégorie",
  sousCategorie: "Sous-catégorie",
  marque: "Marque",
  reference: "Référence",
  designation: "Désignation",
  stock: "Total des Dépôts",
  titre: "Titre produit",
  description: "Description",
} as const;

function parseRows(sheet: Sheet): Row[] {
  const header = sheet.rows.get(1) ?? [];
  const col = {} as Record<keyof typeof HEADERS, number>;
  for (const [key, label] of Object.entries(HEADERS) as [keyof typeof HEADERS, string][]) {
    col[key] = header.findIndex((h) => h && fold(h) === fold(label));
  }
  for (const key of ["univers", "categorie", "reference"] as const) {
    if (col[key] < 0) throw new Error(`Colonne « ${HEADERS[key]} » introuvable en ligne 1.`);
  }
  if (col.titre < 0 && col.designation < 0) throw new Error("Colonne « Titre produit » ou « Désignation » introuvable.");

  const get = (cells: string[], key: keyof typeof HEADERS) => (col[key] >= 0 ? clean(cells[col[key]]) : "");
  const rows: Row[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();
  const remap = new Map(Object.entries(UNIVERS_REMAP).map(([from, to]) => [fold(from), to]));
  const subMerge = new Map(Object.entries(SUBCATEGORY_MERGE).map(([from, to]) => [fold(from), to]));
  const fileUnivers = new Set([...sheet.rows.values()].map((cells) => fold(cleanCategoryName(get(cells, "univers")))));

  for (const [rowNo, cells] of [...sheet.rows.entries()].sort((a, b) => a[0] - b[0])) {
    if (rowNo === 1) continue;
    const sku = get(cells, "reference");
    if (!sku) continue;

    const key = skuKey(sku);
    if (seen.has(key)) errors.push(`Ligne ${rowNo} : référence ${sku} en double (déjà ligne ${seen.get(key)}).`);
    seen.set(key, rowNo);

    const fileUniversName = cleanCategoryName(get(cells, "univers"));
    const mapped = remap.has(fold(fileUniversName)) ? remap.get(fold(fileUniversName))! : fileUniversName;
    if (mapped === null) continue; // univers dropped: its products are not imported
    const univers = mapped;
    const merged = fold(mapped) !== fold(fileUniversName) && fileUnivers.has(fold(mapped));
    const categorie = cleanCategoryName(get(cells, "categorie"));
    const fileSous = cleanCategoryName(get(cells, "sousCategorie"));
    const sous = subMerge.get(fold(`${categorie} > ${fileSous}`)) ?? fileSous;
    if (!univers || !categorie) {
      errors.push(`Ligne ${rowNo} (${sku}) : univers/catégorie manquant.`);
      continue;
    }
    const sameAsCategory = !sous || [slugify(categorie), `${slugify(categorie)}s`].includes(slugify(sous)) || slugify(categorie) === `${slugify(sous)}s`;
    const path = sameAsCategory ? [univers, categorie] : [univers, categorie, sous];

    const brandRaw = get(cells, "marque");
    const title = get(cells, "titre") || get(cells, "designation");
    const stockRaw = get(cells, "stock").replace(/\s/g, "").replace(",", ".");
    const stock = Math.max(0, Math.floor(Number(stockRaw) || 0));

    rows.push({
      rowNo,
      merged,
      path,
      brand: NO_BRAND.has(fold(brandRaw)) ? null : brandRaw,
      sku,
      title,
      description: get(cells, "description") || null,
      stock,
      images: (sheet.images.get(rowNo) ?? []).map((i) => i.data),
    });
  }

  if (errors.length > 0) throw new Error(`Fichier invalide, rien n'a été modifié :\n- ${errors.join("\n- ")}`);
  simplifySubcategories(rows);
  return rows;
}

/** Applies MIN_SUBCATEGORY_PRODUCTS: small sub-categories (or lone ones) are folded into their category. */
function simplifySubcategories(rows: Row[]) {
  const categoryKey = (r: Row) => r.path.slice(0, 2).join(" > ");
  const size = new Map<string, number>();
  for (const r of rows) if (r.path.length === 3) size.set(r.path.join(" > "), (size.get(r.path.join(" > ")) ?? 0) + 1);

  const keptSubs = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.path.length !== 3 || (size.get(r.path.join(" > ")) ?? 0) < MIN_SUBCATEGORY_PRODUCTS) continue;
    keptSubs.set(categoryKey(r), (keptSubs.get(categoryKey(r)) ?? new Set()).add(r.path[2]));
  }
  for (const r of rows) {
    if (r.path.length !== 3) continue;
    const subs = keptSubs.get(categoryKey(r));
    if (!subs || subs.size < 2 || !subs.has(r.path[2])) r.path = r.path.slice(0, 2);
  }
}

type CategoryNode = { key: string; name: string; slug: string; parentKey: string | null; position: number; depth: number };

/** Builds the category tree (parents before children) and assigns globally unique slugs. */
function buildCategoryTree(rows: Row[]) {
  const nodes = new Map<string, CategoryNode>();
  const used = new Set<string>();
  const childCount = new Map<string | null, number>();

  // Stable sort: merged categories are placed after the target univers' own categories.
  for (const row of [...rows].sort((a, b) => Number(a.merged) - Number(b.merged))) {
    let parentKey: string | null = null;
    row.path.forEach((name, depth) => {
      const key = row.path.slice(0, depth + 1).join(" > ");
      if (!nodes.has(key)) {
        const parentSlug = parentKey ? nodes.get(parentKey)!.slug : "";
        let slug = SLUG_OVERRIDES[key] ?? slugify(name);
        if (used.has(slug)) slug = `${parentSlug}-${slug}`;
        for (let n = 2; used.has(slug); n += 1) slug = `${slugify(name)}-${n}`;
        used.add(slug);
        const position = childCount.get(parentKey) ?? 0;
        childCount.set(parentKey, position + 1);
        nodes.set(key, { key, name, slug, parentKey, position, depth });
      }
      parentKey = key;
    });
  }
  return [...nodes.values()].sort((a, b) => a.depth - b.depth);
}

// ---------------------------------------------------------------- import

function keyFromUrl(url: string): string | null {
  return /^\/uploads\/(.+)$/.exec(url)?.[1] ?? null;
}

/** HD_IMAGES_DIR files named "<SKU>__<position>.<ext>" → images per SKU, in position order. */
function readHdImages(): Map<string, Buffer[]> {
  const bySku = new Map<string, { position: number; data: Buffer }[]>();
  let files: string[] = [];
  try {
    files = readdirSync(HD_IMAGES_DIR);
  } catch {
    return new Map();
  }
  for (const file of files) {
    const m = /^(.+)__(\d+)\.(webp|png|jpe?g)$/i.exec(file);
    if (!m) continue;
    const list = bySku.get(m[1]) ?? [];
    list.push({ position: Number(m[2]), data: readFileSync(join(HD_IMAGES_DIR, file)) });
    bySku.set(m[1], list);
  }
  return new Map([...bySku].map(([sku, list]) => [sku, list.sort((a, b) => a.position - b.position).map((i) => i.data)]));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const file = args.find((a) => !a.startsWith("--")) ?? DEFAULT_FILE;

  let sheet: Sheet;
  try {
    sheet = await readSheet(file, PRODUCT_SHEET);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`Fichier introuvable : ${file}`);
    throw error;
  }
  const rows = parseRows(sheet);
  const tree = buildCategoryTree(rows);
  const leafKey = (row: Row) => row.path.join(" > ");

  // ---- plan (read-only)
  const existingProducts = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      slug: true,
      status: true,
      priceMinorUnits: true,
      publishedAt: true,
      images: { select: { url: true } },
      _count: { select: { orderItems: true, stockMovements: true } },
    },
  });
  const bySku = new Map(existingProducts.map((p) => [p.sku, p]));
  const byKey = new Map(existingProducts.map((p) => [skuKey(p.sku), p]));
  const matchOf = (row: Row) => bySku.get(row.sku) ?? byKey.get(skuKey(row.sku)) ?? null;

  const matchedIds = new Set(rows.map(matchOf).filter((p) => p !== null).map((p) => p.id));
  const leftovers = existingProducts.filter((p) => !matchedIds.has(p.id));
  const toArchive = leftovers.filter((p) => p._count.orderItems > 0 || p._count.stockMovements > 0);
  const toDelete = leftovers.filter((p) => !toArchive.includes(p));

  const existingCategories = await prisma.category.findMany({ select: { id: true, slug: true, imageUrl: true } });
  const categoryBySlug = new Map(existingCategories.map((c) => [c.slug, c]));
  const newSlugs = new Set(tree.map((n) => n.slug));
  const oldCategoryIds = existingCategories.filter((c) => !newSlugs.has(c.slug)).map((c) => c.id);

  const existingBrands = await prisma.brand.findMany({ select: { id: true, name: true } });
  const brandByFold = new Map(existingBrands.map((b) => [fold(b.name), b]));
  const fileBrands = [...new Map(rows.filter((r) => r.brand).map((r) => [fold(r.brand!), r.brand!])).values()];

  const newRows = rows.filter((r) => !matchOf(r));
  console.log(`Fichier : ${rows.length} produits, ${tree.length} catégories, ${fileBrands.length} marques.`);
  console.log(
    `Catégories : ${tree.filter((n) => categoryBySlug.has(n.slug)).length} réutilisées, ` +
      `${tree.filter((n) => !categoryBySlug.has(n.slug)).length} créées, ${oldCategoryIds.length} anciennes supprimées.`,
  );
  console.log(
    `Produits : ${rows.length - newRows.length} existants reconstruits, ${newRows.length} créés, ` +
      `${toDelete.length} supprimés, ${toArchive.length} archivés (liés à une commande).`,
  );
  console.log(`Marques : ${fileBrands.filter((b) => !brandByFold.has(fold(b))).join(", ") || "aucune"} à créer.`);
  if (toArchive.length > 0) console.log(`  Archivés : ${toArchive.map((p) => p.sku).join(", ")}`);

  if (dryRun) {
    const count = (key: string) => rows.filter((r) => leafKey(r) === key || leafKey(r).startsWith(`${key} > `)).length;
    const printNode = (parentKey: string | null) =>
      tree
        .filter((n) => n.parentKey === parentKey)
        .forEach((n) => {
          console.log(`${"  ".repeat(n.depth + 1)}${n.name} [/${n.slug}] (${count(n.key)})`);
          printNode(n.key);
        });
    console.log("\nArborescence :");
    printNode(null);
    console.log("\n--dry-run : aucune modification.");
    return;
  }

  // ---- apply catalogue changes atomically
  const imageUrlsToDelete = toDelete.flatMap((p) => p.images.map((i) => i.url));
  const result = await prisma.$transaction(
    async (tx) => {
      // Brands (existing rows keep their logo).
      const brandId = new Map<string, string>();
      for (const name of fileBrands) {
        const existing = brandByFold.get(fold(name));
        const id = existing
          ? existing.id
          : (await tx.brand.create({ data: { name, slug: slugify(name) }, select: { id: true } })).id;
        brandId.set(fold(name), id);
      }

      // Categories, parents first; reuse rows whose slug already exists.
      const categoryId = new Map<string, string>();
      for (const node of tree) {
        const existing = categoryBySlug.get(node.slug);
        const data = {
          parentId: node.parentKey ? categoryId.get(node.parentKey)! : null,
          position: node.position,
          isActive: true,
          imageUrl: CATEGORY_IMAGE[node.slug] ?? existing?.imageUrl ?? null,
        };
        if (existing) {
          await tx.category.update({ where: { id: existing.id }, data });
          await tx.categoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: existing.id, locale: "fr" } },
            update: { name: node.name },
            create: { categoryId: existing.id, locale: "fr", name: node.name },
          });
          categoryId.set(node.key, existing.id);
        } else {
          const created = await tx.category.create({
            data: { ...data, slug: node.slug, translations: { create: { locale: "fr", name: node.name } } },
            select: { id: true },
          });
          categoryId.set(node.key, created.id);
        }
      }

      // Products not in the file.
      if (toDelete.length > 0) await tx.product.deleteMany({ where: { id: { in: toDelete.map((p) => p.id) } } });
      const fallbackCategory = categoryId.get(tree[0].key)!;
      for (const p of toArchive) {
        await tx.product.update({ where: { id: p.id }, data: { status: "ARCHIVED", primaryCategoryId: fallbackCategory } });
        await tx.productCategory.deleteMany({ where: { productId: p.id } });
      }

      // Products in the file.
      const usedSlugs = new Set([...existingProducts.filter((p) => matchedIds.has(p.id)), ...toArchive].map((p) => p.slug));
      const uniqueSlug = (title: string, sku: string) => {
        const base = slugify(title) || slugify(sku);
        let slug = usedSlugs.has(base) ? `${base}-${slugify(sku)}` : base;
        for (let n = 2; usedSlugs.has(slug); n += 1) slug = `${base}-${n}`;
        usedSlugs.add(slug);
        return slug;
      };

      let published = 0;
      let draft = 0;
      for (const row of rows) {
        const existing = matchOf(row);
        const price = KEEP_EXISTING_PRICES_AND_PHOTOS && existing ? existing.priceMinorUnits : 0;
        const status = price > 0 ? "PUBLISHED" : "DRAFT";
        if (status === "PUBLISHED") published += 1;
        else draft += 1;

        const translation = {
          name: row.title,
          description: row.description,
          shortDescription: null,
          seoTitle: null,
          seoDescription: row.description ? truncate(row.description, 160) : null,
        };
        const common = {
          sku: row.sku,
          brandId: row.brand ? brandId.get(fold(row.brand))! : null,
          primaryCategoryId: categoryId.get(leafKey(row))!,
          priceMinorUnits: price,
          status,
          publishedAt: status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : null,
        } as const;

        if (existing) {
          await tx.productCategory.deleteMany({ where: { productId: existing.id } });
          await tx.productAttributeValue.deleteMany({ where: { productId: existing.id } });
          if (!KEEP_EXISTING_PRICES_AND_PHOTOS) await tx.productImage.deleteMany({ where: { productId: existing.id } });
          await tx.product.update({
            where: { id: existing.id },
            data: {
              ...common,
              compareAtPriceMinorUnits: KEEP_EXISTING_PRICES_AND_PHOTOS ? undefined : null,
              translations: {
                upsert: { where: { productId_locale: { productId: existing.id, locale: "fr" } }, update: translation, create: { locale: "fr", ...translation } },
              },
              inventory: { upsert: { update: { stockQuantity: row.stock }, create: { stockQuantity: row.stock } } },
            },
          });
        } else {
          await tx.product.create({
            data: {
              ...common,
              slug: uniqueSlug(row.title, row.sku),
              currency: "MAD",
              translations: { create: { locale: "fr", ...translation } },
              inventory: { create: { stockQuantity: row.stock } },
            },
          });
        }
      }

      // Old categories: delete leaves first, up to the roots.
      let remaining = new Set(oldCategoryIds);
      for (let guard = 0; remaining.size > 0 && guard < 20; guard += 1) {
        const rowsLeft = await tx.category.findMany({ where: { id: { in: [...remaining] } }, select: { id: true, parentId: true } });
        const parents = new Set(rowsLeft.map((r) => r.parentId));
        const leaves = rowsLeft.filter((r) => !parents.has(r.id)).map((r) => r.id);
        await tx.category.deleteMany({ where: { id: { in: leaves } } });
        remaining = new Set(rowsLeft.filter((r) => parents.has(r.id)).map((r) => r.id));
      }

      const removedBrands = await tx.brand.deleteMany({ where: { products: { none: {} } } });

      // Banner links to category pages that were removed.
      const banners = await tx.banner.findMany({ select: { id: true, title: true, linkUrl: true } });
      const brokenBanners: string[] = [];
      for (const b of banners) {
        const rewrite = BANNER_LINK_REWRITES[b.linkUrl];
        if (rewrite) await tx.banner.update({ where: { id: b.id }, data: { linkUrl: rewrite } });
        const slug = /^\/categories\/([^/?#]+)/.exec(rewrite ?? b.linkUrl)?.[1];
        if (slug && !newSlugs.has(slug)) brokenBanners.push(`${b.title} → ${b.linkUrl}`);
      }

      return { published, draft, removedBrands: removedBrands.count, brokenBanners };
    },
    { timeout: 300_000, maxWait: 10_000 },
  );

  // ---- files of deleted products
  for (const url of imageUrlsToDelete) {
    const key = keyFromUrl(url);
    if (key) await localStorageAdapter.delete(key).catch(() => {});
  }

  // ---- photos for products without one (outside the transaction; failures are reported, not fatal).
  // Upscaled versions in HD_IMAGES_DIR win over the sheet's small thumbnails; with --refresh-hd-images they
  // also replace a product's current photos (only SKUs present in that folder are touched).
  const hdImages = readHdImages();
  const refreshHd = args.includes("--refresh-hd-images");
  const productsNow = new Map(
    (await prisma.product.findMany({ select: { id: true, sku: true, images: { select: { url: true } } } })).map((p) => [p.sku, p]),
  );
  let imagesCreated = 0;
  let imagesFailed = 0;
  for (const row of rows) {
    const product = productsNow.get(row.sku);
    if (!product) continue;
    const hd = hdImages.get(row.sku);
    const sources = hd ?? row.images;
    if (sources.length === 0) continue;
    if (product.images.length > 0) {
      if (!(refreshHd && hd)) continue;
      for (const img of product.images) {
        const key = keyFromUrl(img.url);
        if (key) await localStorageAdapter.delete(key).catch(() => {});
      }
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
    }
    const productId = product.id;
    let position = 0;
    for (const data of sources) {
      try {
        // Some thumbnails are just under the admin's 200 px minimum: lift them to it.
        const meta = await sharp(data).metadata();
        const short = Math.min(meta.width ?? 0, meta.height ?? 0);
        const input =
          short > 0 && short < PRODUCT_IMAGE_RULES.minWidth
            ? await sharp(data).resize({ width: Math.ceil(((meta.width ?? 0) * 200) / short), height: Math.ceil(((meta.height ?? 0) * 200) / short) }).jpeg({ quality: 92 }).toBuffer()
            : data;
        const img = await processUploadedImage(input, PRODUCT_IMAGE_RULES, "product-image");
        const key = newStorageKey("products", img.ext);
        const { url } = await localStorageAdapter.put(key, img.buffer, img.contentType);
        await prisma.productImage.create({ data: { productId, url, alt: row.title, position } });
        position += 1;
        imagesCreated += 1;
      } catch (error) {
        imagesFailed += 1;
        console.warn(`Image ignorée (${row.sku}, ligne ${row.rowNo}) : ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  console.log(
    `\nImport OK — publiés : ${result.published}, brouillons (sans prix) : ${result.draft}, ` +
      `marques supprimées : ${result.removedBrands}, images ajoutées : ${imagesCreated}${imagesFailed ? `, échecs : ${imagesFailed}` : ""}.`,
  );
  if (result.brokenBanners.length > 0) {
    console.warn(`Bannières pointant vers une catégorie inexistante (à corriger dans l'admin) :\n- ${result.brokenBanners.join("\n- ")}`);
  }
  console.log("Redémarrez l'application pour vider le cache des pages boutique.");
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
