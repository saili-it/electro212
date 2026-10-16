// Home hero slides. Edit the wording here until banners are managed from the
// admin. Keep claims factual: no prices or discounts that aren't real.
export type HeroSlide = {
  eyebrow: string;
  title: string;
  text: string;
  cta: { label: string; categorySlug: string };
  theme: "navy" | "red" | "green";
  iconSlug: string;
};

export const heroSlides: HeroSlide[] = [
  {
    eyebrow: "Gros électroménager",
    title: "Équipez toute votre maison",
    text: "Réfrigérateurs, machines à laver, lave-vaisselle et cuisinières des grandes marques.",
    cta: { label: "Découvrir", categorySlug: "gros-electromenager" },
    theme: "navy",
    iconSlug: "gros-electromenager",
  },
  {
    eyebrow: "Confort de la maison",
    title: "Restez au frais tout l'été",
    text: "Climatiseurs, ventilation et air coolers pour toutes les pièces.",
    cta: { label: "Voir la climatisation", categorySlug: "climatiseurs" },
    theme: "red",
    iconSlug: "confort-de-la-maison",
  },
  {
    eyebrow: "TV et accessoires",
    title: "Le grand écran à la maison",
    text: "Téléviseurs, récepteurs, supports et meubles TV.",
    cta: { label: "Voir les téléviseurs", categorySlug: "televiseurs" },
    theme: "green",
    iconSlug: "tv-et-accessoires",
  },
];
