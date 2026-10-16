import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { ProductCardData } from "@/data/storefront";
import { formatMinorUnits, toMajorUnits } from "@/lib/money";
import { ImagePlaceholderIcon, TruckIcon } from "./icons";

/** Darty-style price: big whole dirhams, small cents. 549000 → "5 490" + ",00 DH" */
export function Price({ minorUnits, className = "" }: { minorUnits: number; className?: string }) {
  const [whole, cents] = formatMinorUnits(minorUnits).replace(/ DH$/, "").split(",");
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

export function ProductCard({ product, className = "" }: { product: ProductCardData; className?: string }) {
  const hasDiscount =
    product.compareAtPriceMinorUnits !== null && product.compareAtPriceMinorUnits > product.priceMinorUnits;
  const discount = hasDiscount
    ? Math.round(((product.compareAtPriceMinorUnits! - product.priceMinorUnits) / product.compareAtPriceMinorUnits!) * 100)
    : null;
  // One product at or above the threshold qualifies for free delivery on its own.
  const freeDelivery = toMajorUnits(product.priceMinorUnits) >= siteConfig.freeDeliveryThresholdMad;

  return (
    <Link
      href={`/produits/${product.slug}`}
      className={`group flex flex-col rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 transition duration-200 hover:-translate-y-1 hover:shadow-card hover:ring-brand-red/20 ${className}`}
    >
      <div className="relative mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-surface/60">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 24vw, (min-width: 768px) 31vw, (min-width: 640px) 46vw, 50vw"
            className="object-contain p-3 transition duration-300 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImagePlaceholderIcon className="h-14 w-14" />
          </div>
        )}
        {discount !== null && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-brand-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            −{discount}%
          </span>
        )}
      </div>

      {product.brandName && (
        <p className="text-xs font-bold uppercase tracking-wide text-brand-navy">{product.brandName}</p>
      )}
      <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-slate-700 group-hover:text-brand-red-700">
        {product.name}
      </h3>

      <div className="mt-3">
        <p className="h-4 text-xs text-slate-400">
          {hasDiscount && (
            <>
              <span className="line-through">{formatMinorUnits(product.compareAtPriceMinorUnits!)}</span>
            </>
          )}
        </p>
        <Price minorUnits={product.priceMinorUnits} className={`mt-1 text-base ${hasDiscount ? "text-brand-red-600" : "text-brand-navy"}`} />
      </div>

      <div className="mt-auto space-y-1 pt-4 text-xs">
        <p className={`flex items-center gap-1.5 font-medium ${product.inStock ? "text-brand-green-700" : "text-slate-400"}`}>
          <span className={`h-2 w-2 rounded-full ${product.inStock ? "bg-brand-green" : "bg-slate-300"}`} aria-hidden />
          {product.inStock ? "En stock" : "Rupture de stock"}
        </p>
        {freeDelivery && (
          <p className="flex items-center gap-1.5 text-slate-600">
            <TruckIcon className="h-4 w-4" />
            Livraison offerte
          </p>
        )}
      </div>
    </Link>
  );
}
