import "dotenv/config";
import { Prisma, type AttributeDataType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

/*
 * Baseline catalogue structure + clearly-marked demo products.
 * Idempotent and non-destructive: every record is "create if missing"
 * (upsert with an empty update), so re-running never overwrites edits
 * made in the admin. Demo products are removed with `npm run db:remove-demo`.
 */

type SubCategory = { slug: string; name: string; attributes?: string[] };
type MainCategory = { slug: string; name: string; children: SubCategory[] };

// Main categories in the storefront menu order (from the reference site).
const CATEGORY_TREE: MainCategory[] = [
  {
    slug: "tv-et-accessoires",
    name: "TV et accessoires",
    children: [
      { slug: "televiseurs", name: "Téléviseurs", attributes: ["taille_pouces", "resolution", "smart_tv", "recepteur_integre"] },
      { slug: "recepteurs-satellite", name: "Récepteurs satellite" },
      { slug: "supports-tv", name: "Supports TV" },
      { slug: "cables-et-connectique", name: "Câbles et connectique" },
      { slug: "lecteurs-et-audio", name: "Lecteurs et audio" },
    ],
  },
  {
    slug: "gros-electromenager",
    name: "Gros électroménager",
    children: [
      { slug: "refrigerateurs", name: "Réfrigérateurs", attributes: ["type_froid", "capacite_l", "couleur"] },
      { slug: "congelateurs", name: "Congélateurs", attributes: ["type_froid", "capacite_l", "couleur"] },
      { slug: "machines-a-laver", name: "Machines à laver", attributes: ["type_lavage", "capacite_kg", "couleur"] },
      { slug: "lave-vaisselle", name: "Lave-vaisselle", attributes: ["couverts", "installation", "largeur_cm"] },
      { slug: "cuisinieres", name: "Cuisinières", attributes: ["energie", "nombre_feux", "largeur_cm", "installation"] },
    ],
  },
  {
    slug: "petit-electromenager",
    name: "Petit électroménager",
    children: [
      { slug: "preparation-culinaire", name: "Préparation culinaire", attributes: ["puissance_w", "couleur"] },
      { slug: "cuisson", name: "Cuisson", attributes: ["puissance_w", "couleur"] },
      { slug: "cafe-et-petit-dejeuner", name: "Café et petit-déjeuner", attributes: ["puissance_w", "couleur"] },
      { slug: "entretien-et-repassage", name: "Entretien et repassage", attributes: ["puissance_w", "couleur"] },
      { slug: "soins-et-beaute", name: "Soins et beauté", attributes: ["puissance_w", "couleur"] },
    ],
  },
  {
    slug: "confort-de-la-maison",
    name: "Confort de la maison",
    children: [
      { slug: "climatiseurs", name: "Climatiseurs", attributes: ["puissance_btu", "type_clim", "inverter"] },
      { slug: "chauffage", name: "Chauffage", attributes: ["puissance_w"] },
      { slug: "chauffe-eau", name: "Chauffe-eau", attributes: ["capacite_l", "energie"] },
      { slug: "ventilation-et-air-cooler", name: "Ventilation et air cooler", attributes: ["puissance_w"] },
      { slug: "fontaines-a-eau", name: "Fontaines à eau" },
      { slug: "accessoires-confort", name: "Accessoires" },
    ],
  },
  {
    slug: "encastrable",
    name: "Encastrable",
    children: [
      { slug: "fours", name: "Fours", attributes: ["energie", "largeur_cm", "installation"] },
      { slug: "plaques", name: "Plaques", attributes: ["energie", "nombre_feux", "largeur_cm", "installation"] },
      { slug: "hottes", name: "Hottes", attributes: ["largeur_cm", "installation"] },
      { slug: "micro-ondes-encastrables", name: "Micro-ondes encastrables", attributes: ["puissance_w", "installation"] },
      { slug: "eviers-et-robinetterie", name: "Éviers et robinetterie" },
    ],
  },
  {
    slug: "meuble-tv",
    name: "Meuble TV",
    children: [
      { slug: "meubles-tv", name: "Meubles TV" },
      { slug: "tables-et-stands-hi-fi", name: "Tables et stands Hi-Fi" },
    ],
  },
];

// Filters from the specification (claude.md §3.4).
const ATTRIBUTES: {
  code: string;
  label: string;
  dataType: AttributeDataType;
  unit?: string;
  enumOptions?: string[];
}[] = [
  { code: "taille_pouces", label: "Taille d'écran", dataType: "NUMBER", unit: "pouces" },
  { code: "resolution", label: "Résolution", dataType: "ENUM", enumOptions: ["HD", "Full HD", "4K UHD", "8K"] },
  { code: "smart_tv", label: "Smart TV", dataType: "BOOLEAN" },
  { code: "recepteur_integre", label: "Récepteur intégré", dataType: "BOOLEAN" },
  {
    code: "type_froid",
    label: "Type",
    dataType: "ENUM",
    enumOptions: ["Statique", "No Frost", "Combiné", "Side by side", "Coffre", "Vertical"],
  },
  { code: "capacite_l", label: "Capacité", dataType: "NUMBER", unit: "L" },
  {
    code: "type_lavage",
    label: "Type de lavage",
    dataType: "ENUM",
    enumOptions: ["Semi-automatique", "Automatique frontale", "Top load", "Lavante-séchante"],
  },
  { code: "capacite_kg", label: "Capacité de lavage", dataType: "NUMBER", unit: "kg" },
  { code: "couverts", label: "Nombre de couverts", dataType: "NUMBER" },
  { code: "installation", label: "Installation", dataType: "ENUM", enumOptions: ["Pose libre", "Encastrable", "Posable"] },
  { code: "largeur_cm", label: "Largeur", dataType: "NUMBER", unit: "cm" },
  { code: "energie", label: "Énergie", dataType: "ENUM", enumOptions: ["Gaz", "Électrique", "Mixte"] },
  { code: "nombre_feux", label: "Nombre de feux", dataType: "NUMBER" },
  { code: "puissance_btu", label: "Puissance", dataType: "NUMBER", unit: "BTU" },
  { code: "type_clim", label: "Type de climatiseur", dataType: "ENUM", enumOptions: ["Split", "Fenêtre", "Mobile"] },
  { code: "inverter", label: "Inverter", dataType: "BOOLEAN" },
  { code: "puissance_w", label: "Puissance", dataType: "NUMBER", unit: "W" },
  { code: "couleur", label: "Couleur", dataType: "TEXT" },
];

// Only brands evidenced in the reference site's "Nos marques" strip.
const BRANDS = [
  { slug: "samsung", name: "Samsung" },
  { slug: "lg", name: "LG" },
  { slug: "beko", name: "Beko" },
  { slug: "skyworth", name: "Skyworth" },
  { slug: "tescoma", name: "Tescoma" },
];

type DemoProduct = {
  sku: string;
  name: string;
  category: string;
  brand: string;
  priceMad: number;
  compareAtMad?: number;
  stock: number;
  attributes: Record<string, string | number | boolean>;
};

const DEMO_PRODUCTS: DemoProduct[] = [
  { sku: "DEMO-001", name: "Téléviseur 55\" 4K Smart", category: "televiseurs", brand: "samsung", priceMad: 5490, compareAtMad: 5990, stock: 6, attributes: { taille_pouces: 55, resolution: "4K UHD", smart_tv: true, recepteur_integre: true } },
  { sku: "DEMO-002", name: "Téléviseur 43\" Full HD Smart", category: "televiseurs", brand: "lg", priceMad: 3290, stock: 9, attributes: { taille_pouces: 43, resolution: "Full HD", smart_tv: true, recepteur_integre: true } },
  { sku: "DEMO-003", name: "Téléviseur 32\" HD", category: "televiseurs", brand: "skyworth", priceMad: 1590, stock: 14, attributes: { taille_pouces: 32, resolution: "HD", smart_tv: false, recepteur_integre: true } },
  { sku: "DEMO-004", name: "Téléviseur 65\" 4K Smart", category: "televiseurs", brand: "skyworth", priceMad: 6990, compareAtMad: 7690, stock: 2, attributes: { taille_pouces: 65, resolution: "4K UHD", smart_tv: true, recepteur_integre: true } },
  { sku: "DEMO-005", name: "Réfrigérateur combiné No Frost 400 L", category: "refrigerateurs", brand: "samsung", priceMad: 7290, stock: 4, attributes: { type_froid: "Combiné", capacite_l: 400, couleur: "Inox" } },
  { sku: "DEMO-006", name: "Réfrigérateur statique 250 L", category: "refrigerateurs", brand: "beko", priceMad: 3490, stock: 7, attributes: { type_froid: "Statique", capacite_l: 250, couleur: "Blanc" } },
  { sku: "DEMO-007", name: "Congélateur coffre 300 L", category: "congelateurs", brand: "beko", priceMad: 3990, stock: 3, attributes: { type_froid: "Coffre", capacite_l: 300, couleur: "Blanc" } },
  { sku: "DEMO-008", name: "Machine à laver frontale 9 kg", category: "machines-a-laver", brand: "lg", priceMad: 4890, compareAtMad: 5390, stock: 5, attributes: { type_lavage: "Automatique frontale", capacite_kg: 9, couleur: "Blanc" } },
  { sku: "DEMO-009", name: "Machine à laver frontale 8 kg", category: "machines-a-laver", brand: "beko", priceMad: 3890, stock: 8, attributes: { type_lavage: "Automatique frontale", capacite_kg: 8, couleur: "Blanc" } },
  { sku: "DEMO-010", name: "Lavante-séchante 10,5 kg", category: "machines-a-laver", brand: "samsung", priceMad: 7490, stock: 1, attributes: { type_lavage: "Lavante-séchante", capacite_kg: 10.5, couleur: "Gris" } },
  { sku: "DEMO-011", name: "Lave-vaisselle 13 couverts", category: "lave-vaisselle", brand: "beko", priceMad: 4290, stock: 4, attributes: { couverts: 13, installation: "Pose libre", largeur_cm: 60 } },
  { sku: "DEMO-012", name: "Cuisinière 4 feux mixte", category: "cuisinieres", brand: "beko", priceMad: 3190, stock: 6, attributes: { energie: "Mixte", nombre_feux: 4, largeur_cm: 60, installation: "Pose libre" } },
  { sku: "DEMO-013", name: "Climatiseur split Inverter 12000 BTU", category: "climatiseurs", brand: "lg", priceMad: 5690, compareAtMad: 6290, stock: 10, attributes: { puissance_btu: 12000, type_clim: "Split", inverter: true } },
  { sku: "DEMO-014", name: "Climatiseur split 9000 BTU", category: "climatiseurs", brand: "samsung", priceMad: 3990, stock: 0, attributes: { puissance_btu: 9000, type_clim: "Split", inverter: false } },
  { sku: "DEMO-015", name: "Four encastrable électrique 60 cm", category: "fours", brand: "beko", priceMad: 3590, stock: 3, attributes: { energie: "Électrique", largeur_cm: 60, installation: "Encastrable" } },
  { sku: "DEMO-016", name: "Plaque de cuisson gaz 4 feux", category: "plaques", brand: "beko", priceMad: 1890, stock: 5, attributes: { energie: "Gaz", nombre_feux: 4, largeur_cm: 60, installation: "Encastrable" } },
  { sku: "DEMO-017", name: "Hotte aspirante 90 cm", category: "hottes", brand: "beko", priceMad: 2290, stock: 2, attributes: { largeur_cm: 90, installation: "Encastrable" } },
  { sku: "DEMO-018", name: "Micro-ondes encastrable 25 L", category: "micro-ondes-encastrables", brand: "samsung", priceMad: 2490, stock: 3, attributes: { puissance_w: 900, installation: "Encastrable" } },
  { sku: "DEMO-019", name: "Robot de cuisine multifonction", category: "preparation-culinaire", brand: "tescoma", priceMad: 990, stock: 12, attributes: { puissance_w: 1000, couleur: "Blanc" } },
  { sku: "DEMO-020", name: "Meuble TV 180 cm", category: "meubles-tv", brand: "skyworth", priceMad: 1490, stock: 4, attributes: {} },
];

const DEMO_SHORT_DESCRIPTION = "Produit de démonstration — à remplacer par une vraie fiche avant publication.";

const toMinor = (mad: number) => Math.round(mad * 100);
const slugify = (input: string) =>
  input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function seedAttributes() {
  const ids = new Map<string, string>();
  for (const attribute of ATTRIBUTES) {
    const row = await prisma.attribute.upsert({
      where: { code: attribute.code },
      update: {},
      create: {
        code: attribute.code,
        label: attribute.label,
        dataType: attribute.dataType,
        unit: attribute.unit ?? null,
        enumOptions: attribute.enumOptions ?? Prisma.DbNull,
      },
    });
    ids.set(attribute.code, row.id);
  }
  return ids;
}

async function upsertCategory(
  slug: string,
  name: string,
  position: number,
  parentId: string | null,
  imageUrl: string | null = null,
) {
  return prisma.category.upsert({
    where: { slug },
    update: {},
    create: { slug, position, parentId, imageUrl, translations: { create: { locale: "fr", name } } },
  });
}

async function seedCategories(attributeIds: Map<string, string>) {
  const ids = new Map<string, string>();
  for (const [mainIndex, main] of CATEGORY_TREE.entries()) {
    // Main-category tile images live in public/categories/<slug>.webp (from the "cat images" folder).
    const parent = await upsertCategory(main.slug, main.name, mainIndex, null, `/categories/${main.slug}.webp`);
    ids.set(main.slug, parent.id);

    for (const [childIndex, child] of main.children.entries()) {
      const category = await upsertCategory(child.slug, child.name, childIndex, parent.id);
      ids.set(child.slug, category.id);

      for (const [attrIndex, code] of (child.attributes ?? []).entries()) {
        const attributeId = attributeIds.get(code);
        if (!attributeId) throw new Error(`Unknown attribute code "${code}" on category "${child.slug}"`);
        await prisma.categoryAttribute.upsert({
          where: { categoryId_attributeId: { categoryId: category.id, attributeId } },
          update: {},
          create: { categoryId: category.id, attributeId, position: attrIndex },
        });
      }
    }
  }
  return ids;
}

async function seedBrands() {
  const ids = new Map<string, string>();
  for (const brand of BRANDS) {
    const row = await prisma.brand.upsert({ where: { slug: brand.slug }, update: {}, create: brand });
    ids.set(brand.slug, row.id);
  }
  return ids;
}

function attributeValue(attributeId: string, value: string | number | boolean) {
  if (typeof value === "number") return { attributeId, valueNumber: new Prisma.Decimal(value) };
  if (typeof value === "boolean") return { attributeId, valueBoolean: value };
  return { attributeId, valueText: value };
}

async function seedDemoProducts(
  categoryIds: Map<string, string>,
  brandIds: Map<string, string>,
  attributeIds: Map<string, string>,
) {
  let created = 0;
  for (const demo of DEMO_PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { sku: demo.sku } });
    if (existing) continue;

    const primaryCategoryId = categoryIds.get(demo.category);
    const brandId = brandIds.get(demo.brand);
    if (!primaryCategoryId || !brandId) throw new Error(`Bad category/brand on ${demo.sku}`);

    const brandName = BRANDS.find((b) => b.slug === demo.brand)!.name;
    const name = `[Démo] ${demo.name} ${brandName}`;

    await prisma.product.create({
      data: {
        sku: demo.sku,
        slug: `demo-${slugify(`${demo.name} ${brandName}`)}-${demo.sku.toLowerCase()}`,
        brandId,
        primaryCategoryId,
        priceMinorUnits: toMinor(demo.priceMad),
        compareAtPriceMinorUnits: demo.compareAtMad ? toMinor(demo.compareAtMad) : null,
        status: "DRAFT",
        translations: { create: { locale: "fr", name, shortDescription: DEMO_SHORT_DESCRIPTION } },
        inventory: { create: { stockQuantity: demo.stock } },
        attributeValues: {
          create: Object.entries(demo.attributes).map(([code, value]) => {
            const attributeId = attributeIds.get(code);
            if (!attributeId) throw new Error(`Unknown attribute "${code}" on ${demo.sku}`);
            return attributeValue(attributeId, value);
          }),
        },
      },
    });
    created += 1;
  }
  return created;
}

async function main() {
  const attributeIds = await seedAttributes();
  const categoryIds = await seedCategories(attributeIds);
  const brandIds = await seedBrands();
  const demoCreated = await seedDemoProducts(categoryIds, brandIds, attributeIds);

  const [categories, brands, attributes, products] = await Promise.all([
    prisma.category.count(),
    prisma.brand.count(),
    prisma.attribute.count(),
    prisma.product.count(),
  ]);
  console.log(
    `Seed OK — catégories: ${categories}, marques: ${brands}, attributs: ${attributes}, produits: ${products} (${demoCreated} démo créés cette fois)`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
