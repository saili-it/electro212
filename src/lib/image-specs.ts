/*
 * Image requirements — the single source of truth for both the upload
 * validation (server, lib/image-processing.ts) and the hints shown under each
 * image field in the admin, so what admins are told always matches what is
 * enforced. Pure data: no sharp/Node imports, safe in client components.
 */

export type ImageRules = {
  maxBytes: number;
  minWidth: number;
  minHeight: number;
  /** Larger images are downscaled to this width. */
  maxWidth: number;
};

const MB = 1024 * 1024;

// "Publicités" (PROMO) banners — shown 4:3 beside the hero. Name kept for existing callers/tests.
export const BANNER_IMAGE_RULES: ImageRules = { maxBytes: 5 * MB, minWidth: 600, minHeight: 150, maxWidth: 1600 };
// Hero slide and promotion header: wide, high-res, shown large, so a bigger file and width are allowed.
export const HERO_IMAGE_RULES: ImageRules = { maxBytes: 6 * MB, minWidth: 1000, minHeight: 360, maxWidth: 2000 };
// Side insert beside the hero. (SIDE placement currently unused — Publicités fill that spot.)
export const SIDE_IMAGE_RULES: ImageRules = { maxBytes: 4 * MB, minWidth: 500, minHeight: 180, maxWidth: 1000 };
// Mid-page advertising banner: wide strip (~4:1).
export const MIDDLE_IMAGE_RULES: ImageRules = { maxBytes: 5 * MB, minWidth: 1000, minHeight: 220, maxWidth: 2000 };
// Product photo: shown up to ~600px (≈1400 on a 2× display), so cap there; allow large source files.
export const PRODUCT_IMAGE_RULES: ImageRules = { maxBytes: 15 * MB, minWidth: 200, minHeight: 200, maxWidth: 1400 };

/** `accept` attribute for uploads — matches the formats the server accepts (sniffed from the bytes). */
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

export type ImageSpec = {
  /** The size to design at. */
  recommended: { width: number; height: number };
  ratio: string;
  formats: string;
  /** Upload limits enforced by the server. Absent for images given as a URL (category, brand). */
  rules?: ImageRules;
  /** Where it appears and what to watch for. */
  tips: string[];
};

export const IMAGE_SPECS = {
  hero: {
    recommended: { width: 1920, height: 960 },
    ratio: "2:1",
    formats: "JPEG, PNG ou WebP",
    rules: HERO_IMAGE_RULES,
    tips: [
      "Grand carrousel en haut de l'accueil, à côté des publicités.",
      "Gardez le texte et le produit au centre : sur mobile l'image est recadrée en 16:9 (les côtés sont coupés).",
    ],
  },
  promo: {
    recommended: { width: 640, height: 480 },
    ratio: "4:3",
    formats: "JPEG, PNG ou WebP",
    rules: BANNER_IMAGE_RULES,
    tips: ["Les 2 premières s'affichent empilées à droite du carrousel (en dessous sur mobile)."],
  },
  middle: {
    recommended: { width: 1600, height: 400 },
    ratio: "4:1",
    formats: "JPEG, PNG ou WebP",
    rules: MIDDLE_IMAGE_RULES,
    tips: ["Bandeau pleine largeur au milieu de la page d'accueil."],
  },
  product: {
    recommended: { width: 1000, height: 1000 },
    ratio: "1:1, carré",
    formats: "JPEG, PNG ou WebP",
    rules: PRODUCT_IMAGE_RULES,
    tips: ["Fond blanc, produit centré, sans texte ni bordure.", "La 1re image est l'image principale (cartes produit)."],
  },
  promotionHero: {
    recommended: { width: 1600, height: 700 },
    ratio: "16:7",
    formats: "JPEG, PNG ou WebP",
    rules: HERO_IMAGE_RULES,
    tips: [
      "Carte de l'événement sur la page Promotions, et en-tête de sa page.",
      "Visuel important au centre : l'en-tête est recadré en bandeau plus étroit.",
    ],
  },
  category: {
    recommended: { width: 400, height: 400 },
    ratio: "1:1, carré",
    formats: "PNG, JPEG ou WebP",
    tips: ["Affichée dans un cercle (« Nos univers ») : produit centré sur fond blanc, les coins sont coupés."],
  },
  brand: {
    recommended: { width: 480, height: 200 },
    ratio: "logo horizontal",
    formats: "PNG transparent ou SVG",
    tips: [
      "Affiché dans « Nos marques » (accueil) et sur la page de la marque : logo lisible, sans marges autour.",
      "Les logos fournis avec le site sont dans /brands/ (ex. /brands/samsung.png).",
    ],
  },
} satisfies Record<string, ImageSpec>;

export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / MB)} Mo`;
}
