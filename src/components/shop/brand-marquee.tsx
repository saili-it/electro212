import Link from "next/link";
import type { ShopBrand } from "@/data/storefront";
import { BrandLogo } from "./brand-logo";

/**
 * "Nos marques" as an endless scrolling strip of logos. The list is rendered twice so the loop is
 * seamless; the copy is hidden from assistive tech. Pauses on hover; static (and wrapping) when the
 * visitor prefers reduced motion.
 */
export function BrandMarquee({ brands }: { brands: ShopBrand[] }) {
  if (brands.length === 0) return null;
  const item = (brand: ShopBrand, copy: boolean) => (
    <li key={`${copy ? "copy-" : ""}${brand.id}`} aria-hidden={copy || undefined} className="shrink-0">
      <Link
        href={`/marques/${brand.slug}`}
        tabIndex={copy ? -1 : undefined}
        aria-label={`Produits ${brand.name}`}
        className="flex h-20 w-44 items-center justify-center rounded-xl bg-white px-6 ring-1 ring-slate-200 grayscale transition duration-200 hover:ring-2 hover:ring-brand-red-600 hover:grayscale-0 sm:h-24 sm:w-52"
      >
        {brand.logoUrl ? (
          <BrandLogo src={brand.logoUrl} name={brand.name} />
        ) : (
          <span className="font-display text-xl font-extrabold uppercase text-slate-500">{brand.name}</span>
        )}
      </Link>
    </li>
  );
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      <ul className="animate-marquee flex w-max gap-4 motion-reduce:w-auto motion-reduce:flex-wrap">
        {brands.map((b) => item(b, false))}
        {brands.map((b) => item(b, true))}
      </ul>
    </div>
  );
}
