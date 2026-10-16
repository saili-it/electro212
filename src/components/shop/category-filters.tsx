import Link from "next/link";
import { formatMinorUnits } from "@/lib/money";
import type { CategoryFilters } from "@/lib/catalog-filters";
import type { AttributeFacet, BrandFacet } from "@/lib/catalog-filters";

type Facets = {
  brands: BrandFacet[];
  attributes: AttributeFacet[];
  priceRange: { min: number; max: number } | null;
};

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 py-4 first:border-t-0 first:pt-0">
      <p className="mb-3 text-sm font-bold text-brand-navy">{title}</p>
      {children}
    </div>
  );
}

function CheckOption({
  name,
  value,
  label,
  count,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  count: number;
  checked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-slate-700 hover:text-brand-navy">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="h-4 w-4 accent-brand-red-600" />
      <span className="flex-1">{label}</span>
      <span className="text-xs text-slate-400">{count}</span>
    </label>
  );
}

/** A no-JS GET form: selections become URL params on submit. `action` is the clean category path. */
export function CategoryFiltersForm({
  action,
  facets,
  filters,
}: {
  action: string;
  facets: Facets;
  filters: CategoryFilters;
}) {
  const hasAny = facets.brands.length > 0 || facets.attributes.length > 0 || facets.priceRange !== null;
  if (!hasAny) return null;

  return (
    <form method="get" action={action} className="flex flex-col">
      {/* Preserve the current sort when applying filters. */}
      {filters.sort !== "nouveaute" && <input type="hidden" name="tri" value={filters.sort} />}

      {facets.brands.length > 0 && (
        <FacetGroup title="Marque">
          <div className="flex flex-col">
            {facets.brands.map((brand) => (
              <CheckOption
                key={brand.slug}
                name="marque"
                value={brand.slug}
                label={brand.name}
                count={brand.count}
                checked={filters.brands.includes(brand.slug)}
              />
            ))}
          </div>
        </FacetGroup>
      )}

      {facets.priceRange && (
        <FacetGroup title="Prix">
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="prix_min"
              min={0}
              defaultValue={filters.priceMin ?? ""}
              placeholder="Min"
              aria-label="Prix minimum"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-red focus:outline-none"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              name="prix_max"
              min={0}
              defaultValue={filters.priceMax ?? ""}
              placeholder="Max"
              aria-label="Prix maximum"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-red focus:outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            de {formatMinorUnits(facets.priceRange.min)} à {formatMinorUnits(facets.priceRange.max)}
          </p>
        </FacetGroup>
      )}

      {facets.attributes.map((attr) => (
        <FacetGroup key={attr.code} title={attr.label}>
          <div className="flex max-h-56 flex-col overflow-y-auto">
            {attr.values.map((v) => (
              <CheckOption
                key={v.value}
                name={`a_${attr.code}`}
                value={v.value}
                label={v.label}
                count={v.count}
                checked={(filters.attributes[attr.code] ?? []).includes(v.value)}
              />
            ))}
          </div>
        </FacetGroup>
      ))}

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
        <button
          type="submit"
          className="rounded-full bg-brand-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-red-700"
        >
          Voir les résultats
        </button>
        <Link href={action} className="text-center text-sm font-medium text-slate-500 hover:text-brand-red-700">
          Réinitialiser les filtres
        </Link>
      </div>
    </form>
  );
}
