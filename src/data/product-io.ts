import "server-only";
import ExcelJS from "exceljs";
import { Prisma, type ProductStatus } from "@prisma/client";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { toMajorUnits, toMinorUnits } from "@/lib/money";
import { slugify } from "@/lib/slug";

const CATALOG_ROLES = ["SUPER_ADMIN", "CATALOG_MANAGER"] as const;

// ---- Column schema (single source of truth for export headers + import mapping) ----
// `key` is the stable internal name; `header` is the human-facing column title.
// Attribute columns are dynamic: their header is `attr:<attribute code>`.
const COLUMNS = {
  sku: "SKU",
  slug: "Slug",
  status: "Statut",
  brand: "Marque",
  primaryCategory: "Catégorie principale",
  secondaryCategories: "Catégories secondaires",
  price: "Prix (DH)",
  compareAtPrice: "Prix barré (DH)",
  stock: "Stock",
  name_fr: "Nom (FR)",
  short_fr: "Description courte (FR)",
  desc_fr: "Description (FR)",
  seoTitle_fr: "SEO titre (FR)",
  seoDesc_fr: "SEO description (FR)",
  name_ar: "Nom (AR)",
  short_ar: "Description courte (AR)",
  desc_ar: "Description (AR)",
  seoTitle_ar: "SEO titre (AR)",
  seoDesc_ar: "SEO description (AR)",
} as const;
const ATTR_PREFIX = "attr:";

const STATUS_LABELS: Record<ProductStatus, string> = { DRAFT: "Brouillon", PUBLISHED: "Publié", ARCHIVED: "Archivé" };
const SECONDARY_SEPARATOR = ";";

// ---- Export ---------------------------------------------------------------

export async function buildProductsWorkbook(): Promise<Buffer> {
  await requireAdmin([...CATALOG_ROLES]);

  const [products, attributes] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ sku: "asc" }],
      include: {
        brand: { select: { name: true } },
        primaryCategory: { include: { translations: { where: { locale: DEFAULT_LOCALE } } } },
        categories: { include: { category: { include: { translations: { where: { locale: DEFAULT_LOCALE } } } } } },
        translations: true,
        inventory: true,
        attributeValues: true,
      },
    }),
    prisma.attribute.findMany({ where: { isActive: true }, orderBy: [{ code: "asc" }] }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet("Produits");

  const headers = [...Object.values(COLUMNS), ...attributes.map((a) => `${ATTR_PREFIX}${a.code}`)];
  ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.min(40, Math.max(12, h.length + 2)) }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const catName = (c: { slug: string; translations: { name: string }[] }) => c.translations[0]?.name ?? c.slug;

  for (const p of products) {
    const fr = p.translations.find((t) => t.locale === "fr");
    const ar = p.translations.find((t) => t.locale === "ar");
    const row: Record<string, string | number | null> = {
      [COLUMNS.sku]: p.sku,
      [COLUMNS.slug]: p.slug,
      [COLUMNS.status]: p.status,
      [COLUMNS.brand]: p.brand?.name ?? "",
      [COLUMNS.primaryCategory]: catName(p.primaryCategory),
      [COLUMNS.secondaryCategories]: p.categories.map((pc) => catName(pc.category)).join(`${SECONDARY_SEPARATOR} `),
      [COLUMNS.price]: toMajorUnits(p.priceMinorUnits),
      [COLUMNS.compareAtPrice]: p.compareAtPriceMinorUnits != null ? toMajorUnits(p.compareAtPriceMinorUnits) : "",
      [COLUMNS.stock]: p.inventory?.stockQuantity ?? 0,
      [COLUMNS.name_fr]: fr?.name ?? "",
      [COLUMNS.short_fr]: fr?.shortDescription ?? "",
      [COLUMNS.desc_fr]: fr?.description ?? "",
      [COLUMNS.seoTitle_fr]: fr?.seoTitle ?? "",
      [COLUMNS.seoDesc_fr]: fr?.seoDescription ?? "",
      [COLUMNS.name_ar]: ar?.name ?? "",
      [COLUMNS.short_ar]: ar?.shortDescription ?? "",
      [COLUMNS.desc_ar]: ar?.description ?? "",
      [COLUMNS.seoTitle_ar]: ar?.seoTitle ?? "",
      [COLUMNS.seoDesc_ar]: ar?.seoDescription ?? "",
    };
    for (const attr of attributes) {
      const v = p.attributeValues.find((av) => av.attributeId === attr.id);
      row[`${ATTR_PREFIX}${attr.code}`] =
        v == null
          ? ""
          : v.valueNumber != null
            ? Number(v.valueNumber)
            : v.valueBoolean != null
              ? v.valueBoolean
                ? "true"
                : "false"
              : (v.valueText ?? "");
    }
    ws.addRow(row);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ---- Import: types --------------------------------------------------------

export type RowAction = "create" | "update" | "error";

export type PreviewRow = {
  rowNumber: number; // spreadsheet row number (header is row 1)
  sku: string;
  name: string;
  action: RowAction;
  messages: string[];
};

export type ImportPreview = {
  totalRows: number;
  createCount: number;
  updateCount: number;
  errorCount: number;
  rows: PreviewRow[];
  unknownColumns: string[];
  fatalError?: string;
};

export type ImportResult = ImportPreview & { applied: number; failed: number; jobId: string };

// Normalized, apply-ready data for one valid row. `undefined` means "not
// provided → keep existing / use default"; an explicit value means "set".
type ResolvedRow = {
  rowNumber: number;
  sku: string;
  existingId: string | null;
  slug?: string;
  status?: ProductStatus;
  brandId?: string | null;
  primaryCategoryId?: string;
  secondaryCategoryIds?: string[];
  priceMinorUnits?: number;
  compareAtPriceMinorUnits?: number | null;
  stockQuantity?: number;
  fr?: Partial<Record<"name" | "shortDescription" | "description" | "seoTitle" | "seoDescription", string>>;
  ar?: Partial<Record<"name" | "shortDescription" | "description" | "seoTitle" | "seoDescription", string>>;
  attrs: { attributeId: string; valueText: string | null; valueNumber: Prisma.Decimal | null; valueBoolean: boolean | null }[];
};

type Planned = { preview: PreviewRow; resolved?: ResolvedRow };

// ---- Import: cell / value helpers -----------------------------------------

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("").trim();
    if (typeof v.text === "string") return v.text.trim();
    if (v.result != null) return String(v.result).trim();
  }
  return "";
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s  ]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseStatus(raw: string): ProductStatus | null {
  const up = raw.trim().toUpperCase();
  if (up === "DRAFT" || up === "PUBLISHED" || up === "ARCHIVED") return up;
  const byLabel = (Object.entries(STATUS_LABELS) as [ProductStatus, string][]).find(
    ([, label]) => label.toLowerCase() === raw.trim().toLowerCase(),
  );
  return byLabel ? byLabel[0] : null;
}

function parseBoolean(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (["true", "1", "oui", "yes", "vrai", "x"].includes(v)) return true;
  if (["false", "0", "non", "no", "faux", ""].includes(v)) return false;
  return null;
}

// ---- Import: lookups ------------------------------------------------------

async function loadLookups() {
  const [brands, categories, categoryAttributes, products] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true } }),
    prisma.category.findMany({ include: { translations: { where: { locale: DEFAULT_LOCALE } } } }),
    prisma.categoryAttribute.findMany({ where: { attribute: { isActive: true } }, include: { attribute: true } }),
    prisma.product.findMany({
      select: {
        id: true, sku: true, slug: true, status: true, primaryCategoryId: true,
        priceMinorUnits: true, inventory: { select: { stockQuantity: true } },
      },
    }),
  ]);

  const brandByName = new Map(brands.map((b) => [b.name.trim().toLowerCase(), b.id]));
  const catByName = new Map<string, { id: string; name: string }>();
  for (const c of categories) {
    const name = c.translations[0]?.name ?? c.slug;
    catByName.set(name.trim().toLowerCase(), { id: c.id, name });
    catByName.set(c.slug.trim().toLowerCase(), { id: c.id, name }); // also accept the slug
  }
  // category id -> (attribute code -> attribute meta)
  const attrByCategory = new Map<string, Map<string, (typeof categoryAttributes)[number]["attribute"]>>();
  for (const ca of categoryAttributes) {
    if (!attrByCategory.has(ca.categoryId)) attrByCategory.set(ca.categoryId, new Map());
    attrByCategory.get(ca.categoryId)!.set(ca.attribute.code, ca.attribute);
  }
  const bySku = new Map(products.map((p) => [p.sku.trim().toLowerCase(), p]));
  const slugOwner = new Map(products.map((p) => [p.slug, p.id]));

  return { brandByName, catByName, attrByCategory, bySku, slugOwner };
}

type Lookups = Awaited<ReturnType<typeof loadLookups>>;

// ---- Import: parse the workbook into header-keyed rows ---------------------

function parseWorkbookRows(wb: ExcelJS.Workbook): { headers: string[]; rows: { rowNumber: number; cells: Map<string, string> }[] } {
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };

  const headerRow = ws.getRow(1);
  const indexToHeader = new Map<number, string>();
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const h = cellToString(cell.value);
    if (h) indexToHeader.set(col, h);
  });
  const headers = [...indexToHeader.values()];

  const rows: { rowNumber: number; cells: Map<string, string> }[] = [];
  for (let r = 2; r <= ws.rowCount; r += 1) {
    const row = ws.getRow(r);
    const cells = new Map<string, string>();
    let hasAny = false;
    for (const [col, header] of indexToHeader) {
      const text = cellToString(row.getCell(col).value);
      if (text !== "") hasAny = true;
      cells.set(header, text);
    }
    if (hasAny) rows.push({ rowNumber: r, cells });
  }
  return { headers, rows };
}

// ---- Import: plan one row -------------------------------------------------

function planRow(
  rowNumber: number,
  cells: Map<string, string>,
  present: Set<string>,
  lk: Lookups,
): Planned {
  const messages: string[] = [];
  const has = (col: string) => present.has(col);
  const given = (col: string) => has(col) && (cells.get(col) ?? "") !== "";
  const val = (col: string) => (cells.get(col) ?? "").trim();

  const sku = val(COLUMNS.sku);
  const nameFr = val(COLUMNS.name_fr);

  if (!sku) {
    return { preview: { rowNumber, sku: "", name: nameFr, action: "error", messages: ["SKU manquant"] } };
  }

  const existing = lk.bySku.get(sku.toLowerCase()) ?? null;
  const isCreate = !existing;

  const resolved: ResolvedRow = { rowNumber, sku, existingId: existing?.id ?? null, attrs: [] };

  // --- primary category ---
  let primaryCategoryId = existing?.primaryCategoryId;
  if (given(COLUMNS.primaryCategory)) {
    const found = lk.catByName.get(val(COLUMNS.primaryCategory).toLowerCase());
    if (!found) messages.push(`Catégorie principale introuvable : "${val(COLUMNS.primaryCategory)}"`);
    else {
      primaryCategoryId = found.id;
      resolved.primaryCategoryId = found.id;
    }
  } else if (isCreate) {
    messages.push("Catégorie principale requise");
  }

  // --- brand --- (blank keeps the current brand; to remove a brand, edit the product)
  if (given(COLUMNS.brand)) {
    const id = lk.brandByName.get(val(COLUMNS.brand).toLowerCase());
    if (!id) messages.push(`Marque introuvable : "${val(COLUMNS.brand)}"`);
    else resolved.brandId = id;
  }

  // --- secondary categories ---
  if (has(COLUMNS.secondaryCategories)) {
    const names = val(COLUMNS.secondaryCategories).split(SECONDARY_SEPARATOR).map((s) => s.trim()).filter(Boolean);
    const ids: string[] = [];
    for (const name of names) {
      const found = lk.catByName.get(name.toLowerCase());
      if (!found) messages.push(`Catégorie secondaire introuvable : "${name}"`);
      else if (found.id !== primaryCategoryId && !ids.includes(found.id)) ids.push(found.id);
    }
    resolved.secondaryCategoryIds = ids;
  }

  // --- name (FR) ---
  if (given(COLUMNS.name_fr)) {
    if (nameFr.length > 200) messages.push("Nom (FR) trop long (max 200)");
    resolved.fr = { ...resolved.fr, name: nameFr };
  } else if (isCreate) {
    messages.push("Nom (FR) requis");
  }

  // --- price ---
  let priceMinor = existing?.priceMinorUnits;
  if (given(COLUMNS.price)) {
    const n = parseNumber(val(COLUMNS.price));
    if (n === null || n < 0) messages.push(`Prix invalide : "${val(COLUMNS.price)}"`);
    else {
      priceMinor = toMinorUnits(n);
      resolved.priceMinorUnits = priceMinor;
    }
  } else if (isCreate) {
    messages.push("Prix requis");
  }

  // --- compare-at price ---
  if (given(COLUMNS.compareAtPrice)) {
    const n = parseNumber(val(COLUMNS.compareAtPrice));
    if (n === null || n < 0) messages.push(`Prix barré invalide : "${val(COLUMNS.compareAtPrice)}"`);
    else {
      const minor = toMinorUnits(n);
      if (priceMinor != null && minor <= priceMinor) messages.push("Le prix barré doit être supérieur au prix");
      else resolved.compareAtPriceMinorUnits = minor;
    }
  }

  // --- stock ---
  if (given(COLUMNS.stock)) {
    const n = parseNumber(val(COLUMNS.stock));
    if (n === null || n < 0) messages.push(`Stock invalide : "${val(COLUMNS.stock)}"`);
    else resolved.stockQuantity = Math.trunc(n);
  } else if (isCreate) {
    resolved.stockQuantity = 0;
  }

  // --- slug ---
  if (given(COLUMNS.slug)) {
    const slug = slugify(val(COLUMNS.slug));
    const owner = lk.slugOwner.get(slug);
    if (owner && owner !== existing?.id) messages.push(`Slug déjà utilisé : "${slug}"`);
    else resolved.slug = slug;
  } else if (isCreate && nameFr) {
    const slug = slugify(nameFr);
    const owner = lk.slugOwner.get(slug);
    if (owner) messages.push(`Slug auto "${slug}" déjà utilisé — renseignez la colonne Slug`);
    else resolved.slug = slug;
  }

  // --- status ---
  if (given(COLUMNS.status)) {
    const s = parseStatus(val(COLUMNS.status));
    if (!s) messages.push(`Statut invalide : "${val(COLUMNS.status)}" (DRAFT/PUBLISHED/ARCHIVED)`);
    else resolved.status = s;
  }

  // --- FR secondary text fields ---
  const frText: [string, keyof NonNullable<ResolvedRow["fr"]>][] = [
    [COLUMNS.short_fr, "shortDescription"], [COLUMNS.desc_fr, "description"],
    [COLUMNS.seoTitle_fr, "seoTitle"], [COLUMNS.seoDesc_fr, "seoDescription"],
  ];
  for (const [col, key] of frText) if (given(col)) resolved.fr = { ...resolved.fr, [key]: val(col) };

  // --- AR translation ---
  const arFields: [string, keyof NonNullable<ResolvedRow["ar"]>][] = [
    [COLUMNS.name_ar, "name"], [COLUMNS.short_ar, "shortDescription"], [COLUMNS.desc_ar, "description"],
    [COLUMNS.seoTitle_ar, "seoTitle"], [COLUMNS.seoDesc_ar, "seoDescription"],
  ];
  for (const [col, key] of arFields) if (given(col)) resolved.ar = { ...resolved.ar, [key]: val(col) };

  // --- attributes (only those applicable to the resolved primary category) ---
  if (primaryCategoryId) {
    const applicable = lk.attrByCategory.get(primaryCategoryId);
    if (applicable) {
      for (const [code, attr] of applicable) {
        const col = `${ATTR_PREFIX}${code}`;
        if (!given(col)) continue;
        const raw = val(col);
        if (attr.dataType === "NUMBER") {
          const n = parseNumber(raw);
          if (n === null) messages.push(`"${attr.label}" doit être un nombre`);
          else resolved.attrs.push({ attributeId: attr.id, valueText: null, valueNumber: new Prisma.Decimal(n), valueBoolean: null });
        } else if (attr.dataType === "BOOLEAN") {
          const b = parseBoolean(raw);
          if (b === null) messages.push(`"${attr.label}" doit être oui/non`);
          else resolved.attrs.push({ attributeId: attr.id, valueText: null, valueNumber: null, valueBoolean: b });
        } else if (attr.dataType === "ENUM") {
          const options = Array.isArray(attr.enumOptions) ? (attr.enumOptions as unknown[]).filter((o): o is string => typeof o === "string") : [];
          if (!options.includes(raw)) messages.push(`Valeur invalide pour "${attr.label}" (${options.join(", ")})`);
          else resolved.attrs.push({ attributeId: attr.id, valueText: raw, valueNumber: null, valueBoolean: null });
        } else {
          resolved.attrs.push({ attributeId: attr.id, valueText: raw, valueNumber: null, valueBoolean: null });
        }
      }
    }
  }

  if (messages.length > 0) {
    return { preview: { rowNumber, sku, name: nameFr, action: "error", messages } };
  }
  return {
    preview: { rowNumber, sku, name: nameFr || existing?.slug || sku, action: isCreate ? "create" : "update", messages: [] },
    resolved,
  };
}

// ---- Import: plan the whole workbook --------------------------------------

async function planWorkbook(data: ArrayBuffer): Promise<{ preview: ImportPreview; planned: Planned[] }> {
  const wb = new ExcelJS.Workbook();
  try {
    // exceljs types `load` as the Node global `Buffer`, which clashes with this
    // @types/node's generic Buffer; coerce to exactly what `load` expects.
    await wb.xlsx.load(Buffer.from(data) as unknown as Parameters<typeof wb.xlsx.load>[0]);
  } catch {
    const preview: ImportPreview = { totalRows: 0, createCount: 0, updateCount: 0, errorCount: 0, rows: [], unknownColumns: [], fatalError: "Fichier illisible — fournissez un .xlsx valide." };
    return { preview, planned: [] };
  }

  const { headers, rows } = parseWorkbookRows(wb);
  const known = new Set<string>(Object.values(COLUMNS));
  const present = new Set(headers.filter((h) => known.has(h) || h.startsWith(ATTR_PREFIX)));
  const unknownColumns = headers.filter((h) => !known.has(h) && !h.startsWith(ATTR_PREFIX));

  if (!present.has(COLUMNS.sku)) {
    const preview: ImportPreview = { totalRows: rows.length, createCount: 0, updateCount: 0, errorCount: 0, rows: [], unknownColumns, fatalError: `Colonne "${COLUMNS.sku}" introuvable. Exportez d'abord le modèle Excel.` };
    return { preview, planned: [] };
  }

  const lk = await loadLookups();
  const planned = rows.map((r) => planRow(r.rowNumber, r.cells, present, lk));

  // guard against the same SKU appearing twice in one file
  const seen = new Map<string, number>();
  for (const p of planned) {
    if (p.preview.action === "error") continue;
    const key = p.preview.sku.toLowerCase();
    const first = seen.get(key);
    if (first != null) {
      p.preview.action = "error";
      p.preview.messages = [`SKU en double dans le fichier (déjà ligne ${first})`];
      p.resolved = undefined;
    } else {
      seen.set(key, p.preview.rowNumber);
    }
  }

  const preview: ImportPreview = {
    totalRows: planned.length,
    createCount: planned.filter((p) => p.preview.action === "create").length,
    updateCount: planned.filter((p) => p.preview.action === "update").length,
    errorCount: planned.filter((p) => p.preview.action === "error").length,
    rows: planned.map((p) => p.preview),
    unknownColumns,
  };
  return { preview, planned };
}

export async function previewImport(data: ArrayBuffer): Promise<ImportPreview> {
  await requireAdmin([...CATALOG_ROLES]);
  const { preview } = await planWorkbook(data);
  return preview;
}

// ---- Import: apply one resolved row ---------------------------------------

async function applyRow(r: ResolvedRow): Promise<void> {
  await prisma.$transaction(async (tx) => {
    let productId = r.existingId;

    if (!productId) {
      // create — required fields are guaranteed present by the planner
      const created = await tx.product.create({
        data: {
          sku: r.sku,
          slug: r.slug!,
          brandId: r.brandId ?? null,
          primaryCategoryId: r.primaryCategoryId!,
          priceMinorUnits: r.priceMinorUnits!,
          compareAtPriceMinorUnits: r.compareAtPriceMinorUnits ?? null,
          status: r.status ?? "DRAFT",
          publishedAt: r.status === "PUBLISHED" ? new Date() : null,
          translations: { create: [{ locale: "fr", name: r.fr?.name ?? r.sku, shortDescription: r.fr?.shortDescription, description: r.fr?.description, seoTitle: r.fr?.seoTitle, seoDescription: r.fr?.seoDescription }] },
          inventory: { create: { stockQuantity: r.stockQuantity ?? 0 } },
        },
      });
      productId = created.id;
    } else {
      const data: Prisma.ProductUpdateInput = {};
      if (r.slug !== undefined) data.slug = r.slug;
      if (r.brandId !== undefined) data.brand = r.brandId ? { connect: { id: r.brandId } } : { disconnect: true };
      if (r.primaryCategoryId !== undefined) data.primaryCategory = { connect: { id: r.primaryCategoryId } };
      if (r.priceMinorUnits !== undefined) data.priceMinorUnits = r.priceMinorUnits;
      if (r.compareAtPriceMinorUnits !== undefined) data.compareAtPriceMinorUnits = r.compareAtPriceMinorUnits;
      if (r.status !== undefined) {
        data.status = r.status;
        if (r.status === "PUBLISHED") data.publishedAt = new Date();
      }
      if (Object.keys(data).length > 0) await tx.product.update({ where: { id: productId }, data });

      if (r.stockQuantity !== undefined) {
        await tx.inventory.upsert({
          where: { productId }, create: { productId, stockQuantity: r.stockQuantity }, update: { stockQuantity: r.stockQuantity },
        });
      }
      if (r.fr && Object.keys(r.fr).length > 0) {
        await tx.productTranslation.upsert({
          where: { productId_locale: { productId, locale: "fr" } },
          create: { productId, locale: "fr", name: r.fr.name ?? r.sku, shortDescription: r.fr.shortDescription, description: r.fr.description, seoTitle: r.fr.seoTitle, seoDescription: r.fr.seoDescription },
          update: r.fr,
        });
      }
    }

    // secondary categories — replace the set only when the column was provided
    if (r.secondaryCategoryIds !== undefined) {
      await tx.productCategory.deleteMany({ where: { productId } });
      if (r.secondaryCategoryIds.length > 0) {
        await tx.productCategory.createMany({ data: r.secondaryCategoryIds.map((categoryId) => ({ productId: productId!, categoryId })) });
      }
    }

    // Arabic translation — upsert only when AR columns were provided
    if (r.ar && Object.keys(r.ar).length > 0 && r.ar.name) {
      await tx.productTranslation.upsert({
        where: { productId_locale: { productId, locale: "ar" } },
        create: { productId, locale: "ar", name: r.ar.name, shortDescription: r.ar.shortDescription, description: r.ar.description, seoTitle: r.ar.seoTitle, seoDescription: r.ar.seoDescription },
        update: r.ar,
      });
    }

    // attributes — upsert each provided value (never clears others)
    for (const a of r.attrs) {
      await tx.productAttributeValue.upsert({
        where: { productId_attributeId: { productId, attributeId: a.attributeId } },
        create: { productId, attributeId: a.attributeId, valueText: a.valueText, valueNumber: a.valueNumber, valueBoolean: a.valueBoolean },
        update: { valueText: a.valueText, valueNumber: a.valueNumber, valueBoolean: a.valueBoolean },
      });
    }
  });
}

// ---- Import: commit -------------------------------------------------------

export async function commitImport(data: ArrayBuffer, fileName: string): Promise<ImportResult> {
  const admin = await requireAdmin([...CATALOG_ROLES]);
  const { preview, planned } = await planWorkbook(data);

  if (preview.fatalError) {
    return { ...preview, applied: 0, failed: 0, jobId: "" };
  }

  let applied = 0;
  let failed = 0;
  const jobRows: { rowNumber: number; sku: string; status: "ok" | "error"; message: string | null }[] = [];

  for (const p of planned) {
    if (p.preview.action === "error" || !p.resolved) {
      failed += 1;
      jobRows.push({ rowNumber: p.preview.rowNumber, sku: p.preview.sku, status: "error", message: p.preview.messages.join("; ") || "ignoré" });
      continue;
    }
    try {
      await applyRow(p.resolved);
      applied += 1;
      jobRows.push({ rowNumber: p.preview.rowNumber, sku: p.preview.sku, status: "ok", message: p.preview.action });
    } catch (err) {
      failed += 1;
      const message = err instanceof Prisma.PrismaClientKnownRequestError ? `Erreur base de données (${err.code})` : "Échec de l'enregistrement";
      p.preview.action = "error";
      p.preview.messages = [message];
      jobRows.push({ rowNumber: p.preview.rowNumber, sku: p.preview.sku, status: "error", message });
    }
  }

  const job = await prisma.importJob.create({
    data: {
      fileName,
      status: failed === 0 ? "completed" : applied === 0 ? "failed" : "completed",
      totalRows: preview.totalRows,
      okRows: applied,
      errorRows: failed,
      createdById: admin.id,
      rows: { create: jobRows.map((jr) => ({ rowNumber: jr.rowNumber, sku: jr.sku || null, status: jr.status, message: jr.message, rawData: {} })) },
    },
  });

  return {
    ...preview,
    createCount: planned.filter((p) => p.preview.action === "create").length,
    updateCount: planned.filter((p) => p.preview.action === "update").length,
    errorCount: planned.filter((p) => p.preview.action === "error").length,
    rows: planned.map((p) => p.preview),
    applied,
    failed,
    jobId: job.id,
  };
}
