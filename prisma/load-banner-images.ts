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
 * modified — except the RETIRED ones below, which are switched off (not deleted:
 * re-enable them from Admin → Bannières).
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
  position?: number;
};

// Product-led banners built from the shop's own HD product photos (TV, lavage, froid, petit électroménager,
// encastrable). Hero slides carry live text (headline/subtitle/button drawn by the site); side banners have
// their text in the picture.
const BANNERS: Seed[] = [
  {
    file: "accueil-tv.jpg",
    placement: "HERO",
    title: "Accueil — téléviseurs",
    linkUrl: "/categories/televiseurs",
    headline: "Le grand écran à la maison",
    subtitle: "Smart TV 4K, QLED et Google TV des grandes marques",
    ctaLabel: "Voir les téléviseurs",
    position: 0,
  },
  {
    file: "accueil-lavage.jpg",
    placement: "HERO",
    title: "Accueil — lavage",
    linkUrl: "/categories/machine-a-laver",
    headline: "Un linge impeccable",
    subtitle: "Machines à laver frontales et top, pour toute la famille",
    ctaLabel: "Voir les machines",
    position: 1,
  },
  {
    file: "accueil-froid.jpg",
    placement: "HERO",
    title: "Accueil — froid",
    linkUrl: "/categories/refrigerateur",
    headline: "Fraîcheur garantie",
    subtitle: "Réfrigérateurs combinés, side-by-side et congélateurs",
    ctaLabel: "Voir les réfrigérateurs",
    position: 2,
  },
  { file: "publicite-petit-electromenager.jpg", placement: "PROMO", title: "Publicité — petit électroménager", linkUrl: "/categories/petit-electromenager", position: 0 },
  { file: "publicite-encastrable-produits.jpg", placement: "PROMO", title: "Publicité — encastrable produits", linkUrl: "/categories/encastrable", position: 1 },
  { file: "milieu-livraison-gratuite.jpg", placement: "MIDDLE", title: "Milieu — livraison gratuite", linkUrl: "/promotions" },
];

// Earlier ambiance-photo banners from this script, replaced by the product-led ones above.
const RETIRED = [
  "Accueil — cuisine équipée",
  "Accueil — confort de la maison",
  "Publicité — gros électroménager",
  "Publicité — encastrable",
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
        position: seed.position ?? 0,
        isActive: true,
      },
    });
    added += 1;
    console.log(`+ ajouté : ${seed.title} (${img.width}×${img.height})`);
  }
  const retired = await prisma.banner.updateMany({ where: { title: { in: RETIRED }, isActive: true }, data: { isActive: false } });
  console.log(`${added} bannière(s) ajoutée(s), ${retired.count} ancienne(s) désactivée(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
