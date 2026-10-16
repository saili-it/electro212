import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPromotionPageData } from "@/data/promotions";
import { siteConfig } from "@/config/site";
import { formatShopDeadline } from "@/lib/datetime";
import { buildQuery, paginate, parseFilters, sortProducts } from "@/lib/catalog-filters";
import { ProductCard } from "@/components/shop/product-card";
import { SortSelect } from "@/components/shop/sort-select";
import { Reveal } from "@/components/shop/reveal";

export const instant = false;

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPromotionPageData(slug);
  if (!data) return {};

  const sp = await searchParams;
  const filtered = Boolean(sp.tri) || Number(sp.page ?? 1) > 1;

  return {
    title: data.title,
    description: data.subtitle ?? `${data.title} — ${siteConfig.name}. ${data.products.length} produits en promotion.`,
    alternates: { canonical: `/promotions/${slug}` },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", url: `/promotions/${slug}`, title: data.title, images: data.heroImageUrl ? [data.heroImageUrl] : undefined },
  };
}

function Pagination({ basePath, filters, totalPages }: { basePath: string; filters: ReturnType<typeof parseFilters>; totalPages: number }) {
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

export default async function PromotionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const data = await getPromotionPageData(slug);
  if (!data) notFound();

  const sp = await searchParams;
  const filters = parseFilters(sp, []);
  const basePath = `/promotions/${slug}`;

  // Curated order by default; only re-sort when the shopper explicitly picks one.
  const ordered = sp.tri ? sortProducts(data.products, filters.sort) : data.products;
  const { items, page, totalPages, total } = paginate(ordered, filters.page);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li className="flex items-center gap-1.5">
            <Link href="/" className="hover:text-brand-red-700">Accueil</Link>
            <span aria-hidden className="text-slate-300">/</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Link href="/promotions" className="hover:text-brand-red-700">Promotions</Link>
            <span aria-hidden className="text-slate-300">/</span>
          </li>
          <li className="font-medium text-slate-700">{data.title}</li>
        </ol>
      </nav>

      <header className="mb-6 overflow-hidden rounded-3xl bg-brand-navy text-white shadow-soft">
        <div className="relative">
          {data.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- storage host isn't configured for next/image
            <img src={data.heroImageUrl} alt={data.title} className="h-48 w-full object-cover opacity-70 sm:h-64" />
          )}
          <div className={`${data.heroImageUrl ? "absolute inset-0 bg-gradient-to-r from-brand-navy/85 to-brand-navy/30" : ""} flex flex-col justify-center gap-2 p-6 sm:p-10`}>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{data.title}</h1>
            {data.subtitle && <p className="max-w-2xl text-sm text-white/90 sm:text-base">{data.subtitle}</p>}
            {data.endsAtMs && (
              <p className="mt-1 w-fit rounded-full bg-brand-red-600 px-3 py-1 text-xs font-bold uppercase">
                Jusqu&apos;au {formatShopDeadline(new Date(data.endsAtMs))}
              </p>
            )}
          </div>
        </div>
      </header>

      {data.description && <p className="mb-6 max-w-3xl text-sm text-slate-600">{data.description}</p>}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-soft">
          <p className="font-semibold text-brand-navy">Aucun produit disponible</p>
          <p className="mt-1 text-sm text-slate-500">Les produits de cette promotion ne sont pas disponibles pour le moment.</p>
          <Link href="/promotions" className="mt-4 inline-block text-sm font-medium text-brand-red-700 hover:underline">
            Voir les autres promotions
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
          <Pagination basePath={basePath} filters={{ ...filters, page }} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
