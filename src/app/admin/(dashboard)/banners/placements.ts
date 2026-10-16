import type { BannerPlacement } from "@prisma/client";

export type PlacementKey = "hero" | "promo" | "middle";

export const PLACEMENTS: Record<
  PlacementKey,
  {
    value: BannerPlacement;
    tab: string;
    singular: string;
    newLabel: string;
    sizeHint: string;
    /** Promo cards carry a timer + CTA + footnote. */
    hasCta: boolean;
    /** Hero slides can carry an overlay: headline + subtitle + button on the image. */
    hasOverlay: boolean;
    previewAspect: string;
  }
> = {
  hero: {
    value: "HERO",
    tab: "Bannière d'accueil",
    singular: "bannière d'accueil",
    newLabel: "Nouvelle bannière",
    sizeHint:
      "Format conseillé : grande image 1920 × 900 px (format bannière). Gardez le visuel important au centre ; le texte ci-dessous s'affiche par-dessus. JPEG, PNG ou WebP, 6 Mo max.",
    hasCta: false,
    hasOverlay: true,
    previewAspect: "aspect-[21/9]",
  },
  promo: {
    value: "PROMO",
    tab: "Publicités",
    singular: "publicité",
    newLabel: "Nouvelle publicité",
    sizeHint: "Format conseillé : 1200 × 360 px (10:3). JPEG, PNG ou WebP, 5 Mo max.",
    hasCta: true,
    hasOverlay: false,
    previewAspect: "aspect-[10/3]",
  },
  middle: {
    value: "MIDDLE",
    tab: "Bannière milieu",
    singular: "bannière publicitaire",
    newLabel: "Nouvelle bannière",
    sizeHint:
      "Format conseillé : bannière large, 1600 × 400 px (4:1). Affichée pleine largeur au milieu de la page. JPEG, PNG ou WebP, 5 Mo max.",
    hasCta: false,
    hasOverlay: false,
    previewAspect: "aspect-[4/1]",
  },
};

export function parsePlacement(value: string | undefined): PlacementKey {
  if (value === "hero") return "hero";
  if (value === "middle") return "middle";
  return "promo";
}

export function placementKeyOf(value: BannerPlacement): PlacementKey {
  if (value === "HERO") return "hero";
  if (value === "MIDDLE") return "middle";
  return "promo";
}
