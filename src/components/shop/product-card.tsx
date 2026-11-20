import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { ProductCardData } from "@/data/storefront";
import { formatMinorUnits } from "@/lib/money";
import { QuickAdd } from "./cart/quick-add";
import { ImagePlaceholderIcon, TruckIcon } from "./icons";

/** Darty-style price: big whole dirhams, small cents. 549000 → "5 490" + ",00 DH" */
export function Price({ minorUnits, className = "" }: { minorUnits: number; className?: string }) {
  // \s, not " ": formatMinorUnits separates "DH" with a non-breaking space.
  const [whole, cents] = formatMinorUnits(minorUnits).replace(/\sDH$/, "").split(",");
  return (
    <span className={`inline-flex items-start font-bold leading-none tracking-tight ${className}`}>
      <span className="sr-only">{formatMinorUnits(minorUnits)}</span>
      <span aria-hidden className="text-[1.6em]">
        {whole}
      </span>
      <span aria-hidden className="ml-0.5 mt-[0.1em] text-[0.8em]">
        ,{cents} DH
      </span>
    </span>
  );
}

/** Card price: drops ",00" cents ("5 490 DH"), keeps real cents ("199,90 DH"). */
function cardPrice(minorUnits: number): string {
  // formatMinorUnits separates "DH" with a non-breaking space; keep it so "DH" never wraps alone.
  return formatMinorUnits(minorUnits).replace(/,00(\s)DH$/, "$1DH");
}

export function ProductCard({ product, className = "" }: { product: ProductCardData; className?: string }) {
  const hasDiscount =
    product.compareAtPriceMinorUnits !== null && product.compareAtPriceMinorUnits > product.priceMinorUnits;
  const discount = hasDiscount
    ? Math.round(((product.compareAtPriceMinorUnits! - product.priceMinorUnits) / product.compareAtPriceMinorUnits!) * 100)
    : null;
  // This product alone reaches the free-delivery threshold.
  const freeDelivery = product.inStock && product.priceMinorUnits >= siteConfig.freeDeliveryThresholdMad * 100;

  return (
    // The title link is stretched over the whole card (after:inset-0); the add-to-cart button sits above it.
    <article
      className={`group relative flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 transition duration-200 hover:shadow-card hover:ring-2 hover:ring-brand-red-600 ${className}`}
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 24vw, (min-width: 768px) 31vw, (min-width: 640px) 46vw, 50vw"
            className={`object-contain p-4 transition duration-300 group-hover:scale-105 sm:p-5 ${product.inStock ? "" : "opacity-50 grayscale"}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface text-slate-300">
            <ImagePlaceholderIcon className="h-14 w-14" />
          </div>
        )}
        {discount !== null && (
          <span className="price-tag absolute left-0 top-3 bg-brand-red-600 py-1 pl-2 pr-3 font-display text-lg font-extrabold leading-none text-white">
            −{discount}%
          </span>
        )}
        {freeDelivery && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-brand-green-700 px-1.5 py-1 font-display text-xs font-bold uppercase leading-none tracking-wide text-white">
            <TruckIcon className="h-3.5 w-3.5" />
            Livraison offerte
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t border-slate-100 px-3 pb-3 pt-2.5">
        <p className="flex h-4 items-center justify-between gap-2 font-display text-[13px] font-bold uppercase tracking-wider">
          <span className="truncate text-slate-500">{product.brandName ?? ""}</span>
          <span className={`flex shrink-0 items-center gap-1 ${product.inStock ? "text-brand-green-700" : "text-slate-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${product.inStock ? "bg-brand-green" : "bg-slate-400"}`} aria-hidden />
            {product.inStock ? "En stock" : "Épuisé"}
          </span>
        </p>
        <h3 className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[13px] font-medium leading-snug text-slate-800 sm:text-sm">
          <Link href={`/produits/${product.slug}`} className="transition after:absolute after:inset-0 group-hover:text-brand-red-600">
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            {hasDiscount && (
              <p className="mb-0.5 text-xs text-slate-400 line-through">{cardPrice(product.compareAtPriceMinorUnits!)}</p>
            )}
            <p className="price-tag inline-block whitespace-nowrap bg-brand-red-600 py-1 pl-2.5 pr-3 font-display text-xl font-extrabold leading-none tracking-tight text-white sm:text-2xl">
              {cardPrice(product.priceMinorUnits)}
            </p>
          </div>

          {product.inStock ? (
            <QuickAdd
              tone="dark"
              item={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                priceMinorUnits: product.priceMinorUnits,
                imageUrl: product.imageUrl,
              }}
              className="relative z-10 h-10 w-10"
            />
          ) : (
            <span className="relative z-10 rounded bg-slate-100 px-2 py-1.5 font-display text-xs font-bold uppercase text-slate-500">
              Indisponible
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
