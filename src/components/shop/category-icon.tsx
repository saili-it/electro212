import {
  AirVent,
  Beef,
  Blender,
  Cake,
  ChefHat,
  Citrus,
  Coffee,
  CookingPot,
  Croissant,
  CupSoda,
  Droplets,
  Fan,
  Flame,
  GlassWater,
  Heater,
  Microwave,
  Monitor,
  Package,
  Refrigerator,
  Sandwich,
  SatelliteDish,
  ShelvingUnit,
  Shirt,
  ShowerHead,
  Snowflake,
  Sparkles,
  ThermometerSnowflake,
  Tv,
  TvMinimalPlay,
  UtensilsCrossed,
  Utensils,
  WashingMachine,
  Weight,
  Wind,
  type LucideIcon,
} from "lucide-react";

// The main categories, by exact slug.
const MAIN: Record<string, LucideIcon> = {
  "tv-et-accessoires": Tv,
  // The live TV category's actual slug.
  "television-et-accessoire-audio": Tv,
  "gros-electromenager": Refrigerator,
  "petit-electromenager": Blender,
  "confort-de-la-maison": AirVent,
  encastrable: Microwave,
  "meuble-tv": ShelvingUnit,
};

// Sub-categories, by a keyword in the slug — first match wins, so the more specific rules come first.
// A new sub-category picks up an icon automatically when its name contains one of these words.
const KEYWORDS: [RegExp, LucideIcon][] = [
  [/televisions?-smart|smart-tv/, TvMinimalPlay],
  [/support/, Monitor],
  [/televis|^tv-|-tv$/, Tv],
  [/recepteur|parabole|satellite/, SatelliteDish],
  [/machine-a-laver|lave-linge|seche-linge/, WashingMachine],
  [/lave-vaisselle/, Utensils],
  [/refrigerateur|frigo/, Refrigerator],
  [/congelateur/, Snowflake],
  [/cuisini/, CookingPot],
  [/chauffe-eau/, ShowerHead],
  [/chauffage|radiateur/, Heater],
  [/air-cooler|refroidisseur/, ThermometerSnowflake],
  [/climatis/, AirVent],
  [/ventilateur/, Fan],
  [/distributeur|fontaine/, GlassWater],
  [/plaque|plancha|barbecue/, Flame],
  [/hotte|air-fr/, Wind],
  [/evier/, Droplets],
  [/four|micro-onde/, Microwave],
  [/blender/, Blender],
  [/mixeur/, UtensilsCrossed],
  [/hachoir/, Beef],
  [/robot/, ChefHat],
  [/grill|toaster/, Sandwich],
  [/cafetiere|cafe|expresso/, Coffee],
  [/bouilloire/, CupSoda],
  [/fer-a-repasser|repass/, Shirt],
  [/batteur/, Cake],
  [/petrin/, Croissant],
  [/pese/, Weight],
  [/presse-agrume|agrume/, Citrus],
  [/beaute|seche-cheveux|lisseur/, Sparkles],
  [/meuble/, ShelvingUnit],
];

/** Line icon for a category or sub-category (menus, and category tiles without a photo). */
export function CategoryIcon({ slug, className = "h-10 w-10" }: { slug: string; className?: string }) {
  const Icon = MAIN[slug] ?? KEYWORDS.find(([pattern]) => pattern.test(slug))?.[1] ?? Package;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
