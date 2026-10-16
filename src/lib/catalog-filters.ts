import type { AttributeDataType } from "@prisma/client";

export type SortKey = "nouveaute" | "prix-asc" | "prix-desc";
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "nouveaute", label: "Nouveautés" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
];
const SORT_KEYS = SORT_OPTIONS.map((o) => o.value);

export const PAGE_SIZE = 24;

/** Minimal product shape the filter/facet logic needs. */
export type FilterableProduct = {
  priceMinorUnits: number;
  brandSlug: string | null;
  publishedAtMs: number;
  /** attribute code → canonical value string ("9.5", "true", "No Frost"). */
  attrs: Record<string, string>;
};

export type FilterAttribute = { code: string; label: string; dataType: AttributeDataType; unit: string | null };

export type CategoryFilters = {
  brands: string[];
  priceMin: number | null;
  priceMax: number | null;
  /** attribute code → selected value strings. */
  attributes: Record<string, string[]>;
  sort: SortKey;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

function asNumber(value: string | string[] | undefined): number | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  const n = Number(first.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Attribute filters come through as `a_<code>` query params. */
export const ATTR_PARAM_PREFIX = "a_";

export function parseFilters(params: RawParams, attributeCodes: string[]): CategoryFilters {
  const attributes: Record<string, string[]> = {};
  for (const code of attributeCodes) {
    const selected = asArray(params[`${ATTR_PARAM_PREFIX}${code}`]);
    if (selected.length > 0) attributes[code] = selected;
  }
  const sortRaw = Array.isArray(params.tri) ? params.tri[0] : params.tri;
  const page = Math.max(1, asNumber(params.page) ?? 1);
  return {
    brands: asArray(params.marque),
    priceMin: asNumber(params.prix_min),
    priceMax: asNumber(params.prix_max),
    attributes,
    sort: SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "nouveaute",
    page: Math.trunc(page),
  };
}

/** True when any narrowing filter is active (used to noindex filtered URLs). */
export function filtersActive(f: CategoryFilters): boolean {
  return (
    f.brands.length > 0 ||
    f.priceMin !== null ||
    f.priceMax !== null ||
    Object.keys(f.attributes).length > 0
  );
}

export function applyFilters<T extends FilterableProduct>(products: T[], f: CategoryFilters): T[] {
  const minMinor = f.priceMin !== null ? f.priceMin * 100 : null;
  const maxMinor = f.priceMax !== null ? f.priceMax * 100 : null;
  return products.filter((p) => {
    if (f.brands.length > 0 && (!p.brandSlug || !f.brands.includes(p.brandSlug))) return false;
    if (minMinor !== null && p.priceMinorUnits < minMinor) return false;
    if (maxMinor !== null && p.priceMinorUnits > maxMinor) return false;
    for (const [code, values] of Object.entries(f.attributes)) {
      const productValue = p.attrs[code];
      if (!productValue || !values.includes(productValue)) return false;
    }
    return true;
  });
}

export function sortProducts<T extends FilterableProduct>(products: T[], sort: SortKey): T[] {
  const sorted = [...products];
  if (sort === "prix-asc") sorted.sort((a, b) => a.priceMinorUnits - b.priceMinorUnits);
  else if (sort === "prix-desc") sorted.sort((a, b) => b.priceMinorUnits - a.priceMinorUnits);
  else sorted.sort((a, b) => b.publishedAtMs - a.publishedAtMs);
  return sorted;
}

export function paginate<T>(products: T[], page: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  return { items: products.slice(start, start + pageSize), page: current, totalPages, total: products.length };
}

export type BrandFacet = { slug: string; name: string; count: number };
export type AttributeFacetValue = { value: string; label: string; count: number };
export type AttributeFacet = { code: string; label: string; values: AttributeFacetValue[] };

function attributeValueLabel(value: string, attr: FilterAttribute): string {
  if (attr.dataType === "BOOLEAN") return value === "true" ? "Oui" : "Non";
  if (attr.dataType === "NUMBER" && attr.unit) return `${value} ${attr.unit}`;
  return value;
}

function sortFacetValues(values: AttributeFacetValue[], dataType: AttributeDataType): AttributeFacetValue[] {
  if (dataType === "NUMBER") {
    return [...values].sort((a, b) => Number(a.value) - Number(b.value));
  }
  return [...values].sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

/** Facets computed from the full (unfiltered) base set, so every option stays visible with its count. */
export function computeFacets(
  products: (FilterableProduct & { brandName: string | null })[],
  attributes: FilterAttribute[],
) {
  const brandMap = new Map<string, BrandFacet>();
  for (const p of products) {
    if (!p.brandSlug || !p.brandName) continue;
    const existing = brandMap.get(p.brandSlug);
    if (existing) existing.count += 1;
    else brandMap.set(p.brandSlug, { slug: p.brandSlug, name: p.brandName, count: 1 });
  }
  const brands = [...brandMap.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const attributeFacets: AttributeFacet[] = [];
  for (const attr of attributes) {
    const valueMap = new Map<string, AttributeFacetValue>();
    for (const p of products) {
      const v = p.attrs[attr.code];
      if (!v) continue;
      const existing = valueMap.get(v);
      if (existing) existing.count += 1;
      else valueMap.set(v, { value: v, label: attributeValueLabel(v, attr), count: 1 });
    }
    if (valueMap.size > 0) {
      attributeFacets.push({ code: attr.code, label: attr.label, values: sortFacetValues([...valueMap.values()], attr.dataType) });
    }
  }

  const prices = products.map((p) => p.priceMinorUnits);
  const priceRange = prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null;

  return { brands, attributes: attributeFacets, priceRange };
}

/** Serialize filters back to a query string (for pagination/sort links), with overrides. */
export function buildQuery(f: CategoryFilters, overrides: Partial<{ page: number; sort: SortKey }> = {}): string {
  const sp = new URLSearchParams();
  for (const brand of f.brands) sp.append("marque", brand);
  if (f.priceMin !== null) sp.set("prix_min", String(f.priceMin));
  if (f.priceMax !== null) sp.set("prix_max", String(f.priceMax));
  for (const [code, values] of Object.entries(f.attributes)) {
    for (const v of values) sp.append(`${ATTR_PARAM_PREFIX}${code}`, v);
  }
  const sort = overrides.sort ?? f.sort;
  if (sort !== "nouveaute") sp.set("tri", sort);
  const page = overrides.page ?? f.page;
  if (page > 1) sp.set("page", String(page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
