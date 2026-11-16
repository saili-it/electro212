import type { BannerPlacement } from "@prisma/client";

export type PlacementKey = "hero" | "promo" | "middle";

export const PLACEMENTS: Record<
  PlacementKey,
  {
    value: BannerPlacement;
    tab: string;
    singular: string;
    newLabel: string;
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
    hasCta: false,
    hasOverlay: true,
    previewAspect: "aspect-[2/1]",
  },
  promo: {
    value: "PROMO",
    tab: "Publicités",
    singular: "publicité",
    newLabel: "Nouvelle publicité",
    hasCta: true,
    hasOverlay: false,
    previewAspect: "aspect-[4/3]",
  },
  middle: {
    value: "MIDDLE",
    tab: "Bannière milieu",
    singular: "bannière publicitaire",
    newLabel: "Nouvelle bannière",
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
