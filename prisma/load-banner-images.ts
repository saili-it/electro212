import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BannerPlacement } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
// Local adapter directly (no `server-only`), so this runs under tsx — same approach as import-product-images.
import { localStorageAdapter } from "../src/lib/storage/local";
import { BANNER_PLACEMENT_RULES, newStorageKey, processUploadedImage } from "../src/lib/image-processing";

/*
 * Loads the ready-made banner images in `banner-images/` as home-page banners
 * (hero slides, "Publicités" beside the hero, middle banner). Idempotent: a
 * banner whose title already exists is skipped, and existing banners are never
 * modified — deactivate or delete the old ones from Admin → Bannières.
 *
 *   npm run db:load-banners
 */

type Seed = {
  file: string;
  placement: BannerPlacement;
  title: string;
  linkUrl: string;
  headline?: string;
  subtitle?: string;
  ctaLabel?: string;
};

const BANNERS: Seed[] = [
  {
    file: "accueil-1-cuisine.jpg",
    placement: "HERO",
    title: "Accueil — cuisine équipée",
    linkUrl: "/categories/gros-electromenager",
    headline: "Équipez toute votre maison",
    subtitle: "Les grandes marques au meilleur prix",
    ctaLabel: "Découvrir",
  },
  {
    file: "accueil-2-salon.jpg",
    placement: "HERO",
    title: "Accueil — confort de la maison",
    linkUrl: "/categories/confort-de-la-maison",
    headline: "Le confort toute l'année",
    subtitle: "Climatiseurs, chauffages et ventilateurs",
    ctaLabel: "Voir la sélection",
  },
  { file: "publicite-1-gros-electromenager.jpg", placement: "PROMO", title: "Publicité — gros électroménager", linkUrl: "/categories/gros-electromenager" },
  { file: "publicite-2-encastrable.jpg", placement: "PROMO", title: "Publicité — encastrable", linkUrl: "/categories/encastrable" },
  { file: "milieu-livraison-gratuite.jpg", placement: "MIDDLE", title: "Milieu — livraison gratuite", linkUrl: "/promotions" },
];

async function main() {
  let added = 0;
  for (const seed of BANNERS) {
    if (await prisma.banner.findFirst({ where: { title: seed.title }, select: { id: true } })) {
      console.log(`= déjà présent : ${seed.title}`);
      continue;
    }
    const raw = readFileSync(join(process.cwd(), "banner-images", seed.file));
    const img = await processUploadedImage(raw, BANNER_PLACEMENT_RULES[seed.placement], "image");
    const key = newStorageKey("banners", img.ext);
    const { url } = await localStorageAdapter.put(key, img.buffer, img.contentType);
    await prisma.banner.create({
      data: {
        placement: seed.placement,
        title: seed.title,
        imageKey: key,
        imageUrl: url,
        imageWidth: img.width,
        imageHeight: img.height,
        linkUrl: seed.linkUrl,
        ctaLabel: seed.ctaLabel ?? "",
        headline: seed.headline ?? null,
        subtitle: seed.subtitle ?? null,
        position: 0,
        isActive: true,
      },
    });
    added += 1;
    console.log(`+ ajouté : ${seed.title} (${img.width}×${img.height})`);
  }
  console.log(`${added} bannière(s) ajoutée(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
