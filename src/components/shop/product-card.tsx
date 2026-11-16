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
      className={`group relative flex flex-col rounded-2xl bg-white p-2.5 shadow-soft ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-1 hover:shadow-card hover:ring-slate-300 sm:p-3 ${className}`}
    >
      {/* Photo on a soft tile: `mix-blend-multiply` makes the photo's white background take the tile's colour. */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 24vw, (min-width: 768px) 31vw, (min-width: 640px) 46vw, 50vw"
            className={`object-contain p-3 mix-blend-multiply transition duration-300 group-hover:scale-105 sm:p-4 ${product.inStock ? "" : "opacity-50"}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImagePlaceholderIcon className="h-14 w-14" />
          </div>
        )}
        {discount !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-red-600 px-2.5 py-1 text-xs font-extrabold leading-none text-white shadow-sm">
            −{discount}%
          </span>
        )}
        {freeDelivery && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold leading-none text-brand-green-700 shadow-sm">
            <TruckIcon className="h-3.5 w-3.5" />
            Livraison gratuite
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3 sm:px-1.5">
        <p className="h-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{product.brandName ?? ""}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.75em] text-sm font-medium leading-snug text-slate-800">
          <Link href={`/produits/${product.slug}`} className="transition after:absolute after:inset-0 after:rounded-2xl group-hover:text-brand-red-600">
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-3">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className={`text-xl font-extrabold leading-tight tracking-tight ${hasDiscount ? "text-brand-red-600" : "text-brand-dark"}`}>
              {cardPrice(product.priceMinorUnits)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-slate-500 line-through">{cardPrice(product.compareAtPriceMinorUnits!)}</span>
            )}
          </p>
          <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${product.inStock ? "text-brand-green-700" : "text-slate-500"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${product.inStock ? "bg-brand-green" : "bg-slate-400"}`} aria-hidden />
            {product.inStock ? "En stock" : "Rupture de stock"}
          </p>

          {product.inStock ? (
            <QuickAdd
              variant="button"
              item={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                priceMinorUnits: product.priceMinorUnits,
                imageUrl: product.imageUrl,
              }}
              className="relative z-10 mt-3"
            />
          ) : (
            <p className="mt-3 flex h-10 items-center justify-center rounded-full bg-slate-100 text-[13px] font-semibold text-slate-500">
              Indisponible
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
