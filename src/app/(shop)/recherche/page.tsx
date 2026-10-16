import type { Metadata } from "next";
import Link from "next/link";
import { getSearchResults } from "@/data/catalog";
import { paginate, parseFilters, sortProducts } from "@/lib/catalog-filters";
import { ProductCard } from "@/components/shop/product-card";
import { SortSelect } from "@/components/shop/sort-select";
import { Reveal } from "@/components/shop/reveal";
import { SearchIcon } from "@/components/shop/icons";

export const instant = false;

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<SearchParams> };

const firstParam = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = firstParam((await searchParams).q).trim();
  return {
    title: q ? `Recherche : ${q}` : "Recherche",
    // Search result pages are never indexed.
    robots: { index: false, follow: true },
    alternates: { canonical: "/recherche" },
  };
}

function Breadcrumb({ items }: { items: { href?: string; name: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-red-700">
                {item.name}
              </Link>
            ) : (
              <span className="font-medium text-slate-700">{item.name}</span>
            )}
            {i < items.length - 1 && <span aria-hidden className="text-slate-300">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Self-contained GET search box (works without JS); the header search posts here too. */
function SearchField({ q }: { q: string }) {
  return (
    <form action="/recherche" role="search" className="relative mb-6 max-w-xl">
      <label htmlFor="recherche-q" className="sr-only">
        Rechercher un produit
      </label>
      <input
        id="recherche-q"
        type="search"
        name="q"
        defaultValue={q}
        autoFocus={!q}
        placeholder="Rechercher un produit, une marque…"
        className="h-12 w-full rounded-full border border-slate-200 bg-white pl-5 pr-14 text-sm text-slate-900 placeholder:text-slate-500 shadow-soft transition focus:border-brand-red focus:outline-none focus:ring-4 focus:ring-brand-red/10"
      />
      <button
        type="submit"
        aria-label="Rechercher"
        className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-brand-red-600 text-white transition hover:bg-brand-red-700"
      >
        <SearchIcon className="h-[18px] w-[18px]" />
      </button>
    </form>
  );
}

function Pagination({ hrefFor, page, totalPages }: { hrefFor: (p: number) => string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          Précédent
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-slate-300">…</span>}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
              p === page ? "bg-brand-red-600 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          Suivant
        </Link>
      )}
    </nav>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = firstParam(sp.q).trim();
  const filters = parseFilters(sp, []);

  const results = q ? await getSearchResults(q) : [];
  const sorted = sortProducts(results, filters.sort);
  const { items, page, totalPages, total } = paginate(sorted, filters.page);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters.sort !== "nouveaute") params.set("tri", filters.sort);
    if (p > 1) params.set("page", String(p));
    const query = params.toString();
    return query ? `/recherche?${query}` : "/recherche";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb items={[{ href: "/", name: "Accueil" }, { name: "Recherche" }]} />

      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
        {q ? <>Résultats pour «&nbsp;{q}&nbsp;»</> : "Rechercher"}
      </h1>

      <SearchField q={q} />

      {!q ? (
        <p className="text-sm text-slate-500">Saisissez le nom d&apos;un produit ou d&apos;une marque pour lancer la recherche.</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-soft">
          <p className="font-semibold text-brand-navy">Aucun résultat pour «&nbsp;{q}&nbsp;»</p>
          <p className="mt-1 text-sm text-slate-500">Vérifiez l&apos;orthographe ou essayez un terme plus général.</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-brand-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-red-700"
          >
            Parcourir la boutique
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              {total} produit{total > 1 ? "s" : ""}
            </p>
            <SortSelect current={filters.sort} />
          </div>
          <Reveal>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} className="h-full" />
              ))}
            </div>
          </Reveal>
          <Pagination hrefFor={hrefFor} page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
