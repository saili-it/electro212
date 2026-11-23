import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";

/*
 * Applies a price list to the catalogue and publishes the priced products.
 *
 * File: CSV (";" or ","), first line = header with at least a reference column and a price column, e.g.
 *   reference;prix_mad;prix_barre_mad
 *   KCT-270-SF-G;3499.00;
 *   PEAF-3608;899;1099        ← optional crossed-out ("prix barré") price, must be higher than the price
 *   SKY-20;masquer;           ← no price yet: the product goes back to draft (hidden from the shop)
 * Prices are in MAD; a decimal comma ("3 499,90") is accepted. Products are matched by SKU (= the
 * "Référence" of the stock file). Rows whose product doesn't exist are reported and skipped.
 *
 * Effect per matched product: price set, crossed-out price set or cleared (only when the column exists),
 * status PUBLISHED — or DRAFT for "masquer" rows (price left as is). Archived products stay archived. Products absent from the file are not touched.
 * The whole file is validated first: any invalid price aborts before anything is written.
 *
 *   npm run db:apply-prices -- --dry-run          # show what would change
 *   npm run db:apply-prices                       # apply prisma/data/prix-produits.csv
 *   npm run db:apply-prices -- path/to/prix.csv
 *
 * Restart the app afterwards so cached storefront pages show the new prices.
 */

const DEFAULT_FILE = join(process.cwd(), "prisma", "data", "prix-produits.csv");

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const skuKey = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase();

/** "3 499,90" / "3499.9" / "3499" → 349990 centimes; null when empty or not a positive number. */
function toMinor(raw: string | undefined): number | null {
  const s = (raw ?? "").replace(/[\s ]/g, "").replace(/(dh|mad)$/i, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
}

function parseCsv(text: string) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("Fichier vide : il faut une ligne d'en-tête et au moins une ligne de prix.");
  const sep = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(sep).map((h) => fold(h));
  const col = (...names: string[]) => header.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
  const ref = col("reference", "ref", "sku");
  const price = col("prix mad", "prix", "price");
  const compare = col("prix barre", "compare");
  if (ref < 0 || price < 0) throw new Error(`En-tête attendu : "reference;prix_mad[;prix_barre_mad]" (trouvé : ${lines[0]}).`);
  return {
    hasCompare: compare >= 0 && compare !== price,
    rows: lines.slice(1).map((line, i) => {
      const cells = line.split(sep).map((c) => c.trim());
      return { line: i + 2, sku: cells[ref] ?? "", price: cells[price], compare: compare >= 0 && compare !== price ? cells[compare] : undefined };
    }),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const file = args.find((a) => !a.startsWith("--")) ?? DEFAULT_FILE;

  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new Error(`Fichier introuvable : ${file}`);
  }
  const { rows, hasCompare } = parseCsv(text);

  // Validate everything before writing anything.
  const errors: string[] = [];
  const parsed = rows
    .filter((r) => r.sku)
    .map((r) => {
      if (fold(r.price ?? "") === "masquer") return { ...r, hide: true, priceMinor: 0, compareMinor: undefined };
      const price = toMinor(r.price);
      const compare = hasCompare ? toMinor(r.compare) : undefined;
      if (price === null || Number.isNaN(price)) errors.push(`Ligne ${r.line} (${r.sku}) : prix invalide « ${r.price ?? ""} ».`);
      if (Number.isNaN(compare)) errors.push(`Ligne ${r.line} (${r.sku}) : prix barré invalide « ${r.compare} ».`);
      return { ...r, hide: false, priceMinor: price as number, compareMinor: compare };
    });
  if (errors.length > 0) throw new Error(`Rien n'a été modifié :\n- ${errors.join("\n- ")}`);

  const products = await prisma.product.findMany({
    select: { id: true, sku: true, status: true, priceMinorUnits: true, compareAtPriceMinorUnits: true, publishedAt: true },
  });
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const byKey = new Map(products.map((p) => [skuKey(p.sku), p]));

  const unknown: string[] = [];
  let changed = 0;
  let published = 0;
  let hidden = 0;
  let unchanged = 0;
  const updates: { id: string; data: Record<string, unknown> }[] = [];

  for (const row of parsed) {
    const product = bySku.get(row.sku) ?? byKey.get(skuKey(row.sku));
    if (!product) {
      unknown.push(row.sku);
      continue;
    }
    if (row.hide) {
      if (product.status !== "PUBLISHED") {
        unchanged += 1;
        continue;
      }
      hidden += 1;
      changed += 1;
      updates.push({ id: product.id, data: { status: "DRAFT" } });
      continue;
    }
    // A crossed-out price is only kept when it's really higher than the price.
    const compare = row.compareMinor === undefined ? undefined : row.compareMinor && row.compareMinor > row.priceMinor ? row.compareMinor : null;
    const status = product.status === "ARCHIVED" ? "ARCHIVED" : "PUBLISHED";
    const same =
      product.priceMinorUnits === row.priceMinor &&
      (compare === undefined || product.compareAtPriceMinorUnits === compare) &&
      product.status === status;
    if (same) {
      unchanged += 1;
      continue;
    }
    if (product.status === "DRAFT" && status === "PUBLISHED") published += 1;
    changed += 1;
    updates.push({
      id: product.id,
      data: {
        priceMinorUnits: row.priceMinor,
        ...(compare === undefined ? {} : { compareAtPriceMinorUnits: compare }),
        status,
        publishedAt: status === "PUBLISHED" ? (product.publishedAt ?? new Date()) : product.publishedAt,
      },
    });
  }

  console.log(
    `Fichier : ${parsed.length} lignes. Produits modifiés : ${changed} (dont ${published} publiés, ${hidden} masqués), inchangés : ${unchanged}.`,
  );
  if (unknown.length > 0) console.log(`Références inconnues, ignorées (${unknown.length}) : ${unknown.join(", ")}`);
  if (dryRun) {
    console.log("--dry-run : aucune modification.");
    return;
  }
  await prisma.$transaction(updates.map((u) => prisma.product.update({ where: { id: u.id }, data: u.data })));
  console.log("Prix appliqués. Redémarrez l'application pour rafraîchir les pages boutique.");
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
