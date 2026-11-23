import { writeFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";

/*
 * Turns a tariff workbook ("TARIF … POUR SITE WEB.xlsx": the admin product export plus a "PV TTC" column)
 * into the price list applied by `db:apply-prices` (prisma/data/prix-produits.csv).
 *
 * Website price = PV TTC × (1 + MARKUP), rounded to the nearest dirham (half up).
 * A product with no PV TTC is written as "masquer" (back to draft until it gets a price).
 * An optional "Prix barré (DH)" gets the same markup and is kept only if it stays above the price.
 *
 *   npm run db:tarif-to-prices -- "TARIF AU 23-11-26 POUR SITE WEB.xlsx"
 *
 * Then review the diff of prix-produits.csv, commit, and run `db:apply-prices` (locally / on the server).
 */

const MARKUP = 0.15;
const OUT = join(process.cwd(), "prisma", "data", "prix-produits.csv");

type CellValue = ExcelJS.CellValue;

function plain(v: CellValue): unknown {
  if (v && typeof v === "object") {
    if ("result" in v) return v.result;
    if ("text" in v) return v.text;
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
  }
  return v;
}

/** Cell → amount in centimes (integer), or null when empty / not a positive number. */
function centimes(v: CellValue): number | null {
  const raw = plain(v);
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/[\s ]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** Applies the markup on integer centimes (no float drift), then rounds to the nearest dirham. */
export function webPriceDh(pvCentimes: number): number {
  return Math.round((pvCentimes * Math.round((1 + MARKUP) * 100)) / 100 / 100);
}

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!file) throw new Error('Usage : npm run db:tarif-to-prices -- "TARIF ….xlsx"');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const header = (ws.getRow(1).values as CellValue[]).map((h) => String(plain(h) ?? "").trim());
  const col = (name: string) => header.indexOf(name);
  const cSku = col("SKU");
  const cPv = col("PV TTC");
  const cBarre = col("Prix barré (DH)");
  if (cSku < 0 || cPv < 0) throw new Error(`Colonnes "SKU" et "PV TTC" introuvables (en-tête : ${header.filter(Boolean).join(", ")}).`);

  const lines = ["reference;prix_mad;prix_barre_mad"];
  const seen = new Set<string>();
  let priced = 0;
  let hidden = 0;
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const sku = String(plain(row.getCell(cSku).value) ?? "").trim();
    if (!sku) return;
    if (seen.has(sku)) throw new Error(`Référence en double : ${sku} (ligne ${i}).`);
    seen.add(sku);

    const pv = centimes(row.getCell(cPv).value);
    if (pv === null) {
      lines.push(`${sku};masquer;`);
      hidden += 1;
      return;
    }
    const price = webPriceDh(pv);
    const barreRaw = cBarre >= 0 ? centimes(row.getCell(cBarre).value) : null;
    const barre = barreRaw === null ? null : webPriceDh(barreRaw);
    lines.push(`${sku};${price.toFixed(2)};${barre !== null && barre > price ? barre.toFixed(2) : ""}`);
    priced += 1;
  });

  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`${priced} prix (PV TTC + ${MARKUP * 100} %, arrondi au dirham), ${hidden} sans prix → masquer. Écrit : ${OUT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
