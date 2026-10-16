import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryPageData } from "@/data/catalog";
import { siteConfig } from "@/config/site";
import {
  applyFilters,
  buildQuery,
  computeFacets,
  filtersActive,
  paginate,
  parseFilters,
  sortProducts,
} from "@/lib/catalog-filters";
import { ProductCard } from "@/components/shop/product-card";
import { CategoryFiltersForm } from "@/components/shop/category-filters";
import { SortSelect } from "@/components/shop/sort-select";
import { Reveal } from "@/components/shop/reveal";

export const instant = false;

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryPageData(slug);
  if (!data) return {};

  const sp = await searchParams;
  const filters = parseFilters(sp, data.attributes.map((a) => a.code));
  const filtered = filtersActive(filters) || filters.page > 1;

  return {
    title: data.seoTitle ?? data.name,
    description: data.seoDescription ?? `${data.name} — ${siteConfig.name}. ${data.products.length} produits.`,
    alternates: { canonical: `/categories/${slug}` },
    // Don't index filtered/paginated variants; they point back to the clean URL.
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", url: `/categories/${slug}`, title: data.seoTitle ?? data.name },
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

function CatalogJsonLd({
  name,
  slug,
  breadcrumb,
  products,
}: {
  name: string;
  slug: string;
  breadcrumb: { slug: string; name: string }[];
  products: { slug: string; name: string }[];
}) {
  const crumbs = [
    { name: "Accueil", url: siteConfig.url },
    ...breadcrumb.map((b) => ({ name: b.name, url: new URL(`/categories/${b.slug}`, siteConfig.url).toString() })),
    { name, url: new URL(`/categories/${slug}`, siteConfig.url).toString() },
  ];
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: products.slice(0, 30).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: new URL(`/produits/${p.slug}`, siteConfig.url).toString(),
        name: p.name,
      })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

function ShopPagination({ basePath, filters, totalPages }: { basePath: string; filters: ReturnType<typeof parseFilters>; totalPages: number }) {
  if (totalPages <= 1) return null;
  const page = Math.min(filters.page, totalPages);
  const href = (p: number) => `${basePath}${buildQuery(filters, { page: p })}`;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          Précédent
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-slate-300">…</span>}
          <Link
            href={href(p)}
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
        <Link href={href(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          Suivant
        </Link>
      )}
    </nav>
  );
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const data = await getCategoryPageData(slug);
  if (!data) notFound();

  const sp = await searchParams;
  const filters = parseFilters(sp, data.attributes.map((a) => a.code));
  const basePath = `/categories/${slug}`;

  const facets = computeFacets(data.products, data.attributes);
  const filtered = applyFilters(data.products, filters);
  const sorted = sortProducts(filtered, filters.sort);
  const { items, page, totalPages, total } = paginate(sorted, filters.page);
  const isFiltered = filtersActive(filters);

  const filtersAside = <CategoryFiltersForm action={basePath} facets={facets} filters={filters} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <CatalogJsonLd name={data.name} slug={slug} breadcrumb={data.breadcrumb} products={items} />

      <Breadcrumb
        items={[
          { href: "/", name: "Accueil" },
          ...data.breadcrumb.map((b) => ({ href: `/categories/${b.slug}`, name: b.name })),
          { name: data.name },
        ]}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">{data.name}</h1>
        {data.intro && <p className="mt-2 max-w-3xl text-sm text-slate-600">{data.intro}</p>}
      </header>

      {data.children.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2">
          {data.children.map((child) => (
            <li key={child.slug}>
              <Link
                href={`/categories/${child.slug}`}
                className="inline-block rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-soft transition hover:border-brand-red hover:bg-brand-red-50 hover:text-brand-red-700"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          {/* Mobile: collapsible drawer. */}
          <details className="lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand-navy shadow-soft">
              Filtrer{isFiltered ? " · actifs" : ""}
              <span aria-hidden>▾</span>
            </summary>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-soft">{filtersAside}</div>
          </details>
          {/* Desktop: sticky panel. */}
          <div className="hidden rounded-xl border border-slate-200 bg-white p-5 shadow-soft lg:block">{filtersAside}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              {total} produit{total > 1 ? "s" : ""}
            </p>
            <SortSelect current={filters.sort} />
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-soft">
              <p className="font-semibold text-brand-navy">Aucun produit</p>
              <p className="mt-1 text-sm text-slate-500">
                {isFiltered
                  ? "Aucun produit ne correspond à ces filtres."
                  : "Cette catégorie ne contient pas encore de produit."}
              </p>
              {isFiltered && (
                <Link
                  href={basePath}
                  className="mt-4 inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Réinitialiser les filtres
                </Link>
              )}
            </div>
          ) : (
            <Reveal>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} className="h-full" />
                ))}
              </div>
            </Reveal>
          )}

          <ShopPagination basePath={basePath} filters={{ ...filters, page }} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}
