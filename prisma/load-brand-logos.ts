import "dotenv/config";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";

/*
 * Gives the brands their logo from `public/brands/` — shown in "Nos marques" on
 * the home page and on each brand's page. A listed brand that doesn't exist
 * yet is created (active, without products). Safe to run again: it only fills
 * an empty logo or replaces a web link / a previous /brands/ file, and never
 * touches any other brand.
 *
 *   npm run db:load-brand-logos
 *
 * To add a brand: drop its logo in public/brands/ (transparent PNG, about
 * 480×200, no margin) and add a line below.
 */

const BRANDS = [
  { slug: "krohler", name: "KRÖHLER", file: "krohler.png" },
  { slug: "skyworth", name: "SKYWORTH", file: "skyworth.png" },
  { slug: "lg", name: "LG", file: "lg.png" },
  { slug: "samsung", name: "SAMSUNG", file: "samsung.png" },
  { slug: "beko", name: "BEKO", file: "beko.png" },
];

/** True when the current logo may be replaced: none, a web link, or one of our own files. */
function replaceable(logoUrl: string | null) {
  return !logoUrl || /^https?:\/\//i.test(logoUrl) || logoUrl.startsWith("/brands/");
}

async function main() {
  for (const brand of BRANDS) {
    if (!existsSync(join(process.cwd(), "public", "brands", brand.file))) {
      console.log(`! fichier manquant, ignoré : public/brands/${brand.file}`);
      continue;
    }
    const logoUrl = `/brands/${brand.file}`;

    const existing =
      (await prisma.brand.findUnique({ where: { slug: brand.slug } })) ??
      (await prisma.brand.findFirst({ where: { name: { equals: brand.name, mode: "insensitive" } } }));

    if (!existing) {
      await prisma.brand.create({ data: { name: brand.name, slug: brand.slug, logoUrl } });
      console.log(`+ marque créée avec son logo : ${brand.name}`);
    } else if (existing.logoUrl === logoUrl) {
      console.log(`= déjà à jour : ${existing.name}`);
    } else if (replaceable(existing.logoUrl)) {
      await prisma.brand.update({ where: { id: existing.id }, data: { logoUrl } });
      console.log(`~ logo mis à jour : ${existing.name}`);
    } else {
      console.log(`= logo personnalisé conservé : ${existing.name} (${existing.logoUrl})`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
