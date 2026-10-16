import { describe, expect, it } from "vitest";
import {
  applyFilters,
  buildQuery,
  computeFacets,
  filtersActive,
  paginate,
  parseFilters,
  sortProducts,
  type FilterAttribute,
} from "@/lib/catalog-filters";

const attrs: FilterAttribute[] = [
  { code: "capacite_kg", label: "Capacité", dataType: "NUMBER", unit: "kg" },
  { code: "couleur", label: "Couleur", dataType: "TEXT", unit: null },
  { code: "inverter", label: "Inverter", dataType: "BOOLEAN", unit: null },
];

const product = (over: Partial<Parameters<typeof computeFacets>[0][number]>) => ({
  priceMinorUnits: 100000,
  brandSlug: "lg",
  brandName: "LG",
  publishedAtMs: 1000,
  attrs: {},
  ...over,
});

const products = [
  product({ priceMinorUnits: 500000, brandSlug: "samsung", brandName: "Samsung", publishedAtMs: 30, attrs: { capacite_kg: "9", couleur: "Blanc" } }),
  product({ priceMinorUnits: 300000, brandSlug: "lg", brandName: "LG", publishedAtMs: 20, attrs: { capacite_kg: "8", couleur: "Inox" } }),
  product({ priceMinorUnits: 700000, brandSlug: "lg", brandName: "LG", publishedAtMs: 10, attrs: { capacite_kg: "10.5", couleur: "Blanc", inverter: "true" } }),
];

describe("parseFilters", () => {
  it("reads brands, price, attributes, sort and page", () => {
    const f = parseFilters(
      { marque: ["lg", "samsung"], prix_min: "200", prix_max: "600", a_capacite_kg: "9", tri: "prix-asc", page: "2" },
      ["capacite_kg", "couleur"],
    );
    expect(f).toMatchObject({
      brands: ["lg", "samsung"],
      priceMin: 200,
      priceMax: 600,
      attributes: { capacite_kg: ["9"] },
      sort: "prix-asc",
      page: 2,
    });
  });

  it("ignores unknown attribute codes and bad sort/page", () => {
    const f = parseFilters({ a_unknown: "x", tri: "bogus", page: "0" }, ["capacite_kg"]);
    expect(f.attributes).toEqual({});
    expect(f.sort).toBe("nouveaute");
    expect(f.page).toBe(1);
  });

  it("splits comma-separated values", () => {
    const f = parseFilters({ marque: "lg,samsung" }, []);
    expect(f.brands).toEqual(["lg", "samsung"]);
  });
});

describe("filtersActive", () => {
  it("is false with no filters and true with any", () => {
    expect(filtersActive(parseFilters({}, []))).toBe(false);
    expect(filtersActive(parseFilters({ marque: "lg" }, []))).toBe(true);
    expect(filtersActive(parseFilters({ tri: "prix-asc", page: "3" }, []))).toBe(false);
  });
});

describe("applyFilters", () => {
  it("filters by brand", () => {
    const r = applyFilters(products, parseFilters({ marque: "lg" }, []));
    expect(r.map((p) => p.brandSlug)).toEqual(["lg", "lg"]);
  });
  it("filters by price range (MAD → minor units)", () => {
    const r = applyFilters(products, parseFilters({ prix_min: "4000", prix_max: "6000" }, []));
    expect(r).toHaveLength(1);
    expect(r[0].priceMinorUnits).toBe(500000);
  });
  it("filters by attribute value (AND across attrs)", () => {
    const r = applyFilters(products, parseFilters({ a_couleur: "Blanc", a_capacite_kg: "10.5" }, ["couleur", "capacite_kg"]));
    expect(r).toHaveLength(1);
    expect(r[0].attrs.capacite_kg).toBe("10.5");
  });
});

describe("sortProducts", () => {
  it("sorts by price and by newest", () => {
    expect(sortProducts(products, "prix-asc").map((p) => p.priceMinorUnits)).toEqual([300000, 500000, 700000]);
    expect(sortProducts(products, "prix-desc").map((p) => p.priceMinorUnits)).toEqual([700000, 500000, 300000]);
    expect(sortProducts(products, "nouveaute").map((p) => p.publishedAtMs)).toEqual([30, 20, 10]);
  });
});

describe("computeFacets", () => {
  it("builds brand and attribute facets with counts and number sorting", () => {
    const f = computeFacets(products, attrs);
    expect(f.brands).toEqual([
      { slug: "lg", name: "LG", count: 2 },
      { slug: "samsung", name: "Samsung", count: 1 },
    ]);
    const capacite = f.attributes.find((a) => a.code === "capacite_kg")!;
    expect(capacite.values.map((v) => v.value)).toEqual(["8", "9", "10.5"]);
    expect(capacite.values[0].label).toBe("8 kg");
    const inverter = f.attributes.find((a) => a.code === "inverter")!;
    expect(inverter.values).toEqual([{ value: "true", label: "Oui", count: 1 }]);
    expect(f.priceRange).toEqual({ min: 300000, max: 700000 });
  });
});

describe("paginate", () => {
  it("slices and clamps the page", () => {
    const list = Array.from({ length: 50 }, (_, i) => i);
    expect(paginate(list, 2, 24).items).toHaveLength(24);
    expect(paginate(list, 3, 24)).toMatchObject({ page: 3, totalPages: 3, total: 50 });
    expect(paginate(list, 99, 24).page).toBe(3);
  });
});

describe("buildQuery", () => {
  it("round-trips filters and applies overrides", () => {
    const f = parseFilters({ marque: ["lg", "samsung"], prix_min: "200", a_capacite_kg: ["9", "8"], tri: "prix-asc" }, ["capacite_kg"]);
    expect(buildQuery(f, { page: 2 })).toBe("?marque=lg&marque=samsung&prix_min=200&a_capacite_kg=9&a_capacite_kg=8&tri=prix-asc&page=2");
    expect(buildQuery(parseFilters({}, []))).toBe("");
  });
});
