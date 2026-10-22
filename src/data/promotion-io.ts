import "server-only";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "@/lib/i18n";

const MANAGERS = ["SUPER_ADMIN", "CATALOG_MANAGER"] as const;
const SKU_HEADER = "SKU";

export type PromotionImportRow = {
  rowNumber: number;
  sku: string;
  name: string;
  action: "add" | "already" | "error";
  message?: string;
};
export type PromotionImportPreview = {
  total: number;
  addCount: number;
  alreadyCount: number;
  errorCount: number;
  rows: PromotionImportRow[];
  fatalError?: string;
};
export type PromotionImportResult = PromotionImportPreview & { added: number };

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("").trim();
    if (typeof v.text === "string") return v.text.trim();
    if (v.result != null) return String(v.result).trim();
  }
  return "";
}

async function planPromotionImport(
  promotionId: string,
  data: ArrayBuffer,
): Promise<{ preview: PromotionImportPreview; addIds: string[] }> {
  const empty = (fatalError: string): { preview: PromotionImportPreview; addIds: string[] } => ({
    preview: { total: 0, addCount: 0, alreadyCount: 0, errorCount: 0, rows: [], fatalError },
    addIds: [],
  });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(data) as unknown as Parameters<typeof wb.xlsx.load>[0]);
  } catch {
    return empty("Fichier illisible — fournissez un .xlsx valide.");
  }

  const ws = wb.worksheets[0];
  if (!ws) return empty("Feuille de calcul vide.");

  // locate the SKU column by header
  let skuCol = 0;
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    if (cellToString(cell.value).toUpperCase() === SKU_HEADER) skuCol = col;
  });
  if (skuCol === 0) return empty(`Colonne "${SKU_HEADER}" introuvable. Exportez le catalogue (Produits → Exporter Excel) pour obtenir les SKU.`);

  const [products, existingRows] = await Promise.all([
    prisma.product.findMany({
      select: { id: true, sku: true, translations: { where: { locale: DEFAULT_LOCALE }, select: { name: true } } },
    }),
    prisma.promotionProduct.findMany({ where: { promotionId }, select: { productId: true } }),
  ]);
  const bySku = new Map(products.map((p) => [p.sku.trim().toLowerCase(), { id: p.id, name: p.translations[0]?.name ?? p.sku }]));
  const existing = new Set(existingRows.map((r) => r.productId));

  const rows: PromotionImportRow[] = [];
  const addIds: string[] = [];
  const queued = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r += 1) {
    const sku = cellToString(ws.getRow(r).getCell(skuCol).value);
    if (!sku) continue;

    const found = bySku.get(sku.toLowerCase());
    if (!found) {
      rows.push({ rowNumber: r, sku, name: "", action: "error", message: "SKU introuvable" });
      continue;
    }
    if (existing.has(found.id)) {
      rows.push({ rowNumber: r, sku, name: found.name, action: "already", message: "Déjà dans la promotion" });
      continue;
    }
    if (queued.has(found.id)) {
      rows.push({ rowNumber: r, sku, name: found.name, action: "already", message: "En double dans le fichier" });
      continue;
    }
    queued.add(found.id);
    addIds.push(found.id);
    rows.push({ rowNumber: r, sku, name: found.name, action: "add" });
  }

  const preview: PromotionImportPreview = {
    total: rows.length,
    addCount: rows.filter((r) => r.action === "add").length,
    alreadyCount: rows.filter((r) => r.action === "already").length,
    errorCount: rows.filter((r) => r.action === "error").length,
    rows,
  };
  return { preview, addIds };
}

export async function previewPromotionImport(promotionId: string, data: ArrayBuffer): Promise<PromotionImportPreview> {
  await requireAdmin([...MANAGERS]);
  const { preview } = await planPromotionImport(promotionId, data);
  return preview;
}

export async function commitPromotionImport(promotionId: string, data: ArrayBuffer): Promise<PromotionImportResult> {
  await requireAdmin([...MANAGERS]);
  const { preview, addIds } = await planPromotionImport(promotionId, data);
  if (preview.fatalError || addIds.length === 0) return { ...preview, added: 0 };

  const agg = await prisma.promotionProduct.aggregate({ where: { promotionId }, _max: { position: true } });
  let position = (agg._max.position ?? -1) + 1;
  const res = await prisma.promotionProduct.createMany({
    data: addIds.map((productId) => ({ promotionId, productId, position: position++ })),
    skipDuplicates: true,
  });

  return { ...preview, added: res.count };
}
