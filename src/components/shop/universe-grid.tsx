import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MenuCategory } from "@/data/storefront";
import { CategoryIcon } from "./category-icon";

function countLabel(count: number) {
  if (count === 0) return "Toute la gamme";
  return count === 1 ? "1 catégorie" : `${count} catégories`;
}

const arrowChip = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-red-600 text-white";

/**
 * "Nos univers": one card per main category, in the same language as the product
 * cards (white card, picture on a soft grey tile). Phones and small tablets stack
 * the picture above the name; from `md` up the picture sits beside it, with a
 * "Découvrir" call to action. Tile and type sizes step with the column width so
 * a long name ("Électroménager") never overflows its card.
 */
export function UniverseGrid({ categories }: { categories: MenuCategory[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={`/categories/${category.slug}`}
            className="group flex h-full flex-col gap-2.5 rounded-2xl bg-white p-2.5 shadow-soft ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-1 hover:shadow-card hover:ring-brand-red/30 md:flex-row-reverse md:items-stretch md:gap-4 md:p-3"
          >
            <span className="flex aspect-[4/3] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-brand-dark md:aspect-square md:w-32 lg:w-28 xl:w-40">
              {category.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin-provided address, host not known in advance
                <img
                  src={category.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain p-2 mix-blend-multiply transition duration-300 group-hover:scale-105"
                />
              ) : (
                <CategoryIcon slug={category.slug} className="h-12 w-12 xl:h-14 xl:w-14" />
              )}
            </span>

            <span className="flex min-w-0 flex-1 flex-col px-1 pb-1 md:py-2 md:pl-2 md:pr-0">
              <span className="block break-words text-sm font-extrabold leading-snug text-brand-dark transition group-hover:text-brand-red-700 md:text-[17px] md:leading-tight lg:text-base lg:leading-tight xl:text-lg xl:leading-tight">
                {category.name}
              </span>
              {/* Stacked cards have no "Découvrir" line: their arrow closes this row, pinned to the card's foot. */}
              <span className="mt-auto flex items-end justify-between gap-2 pt-1.5 md:mt-1 md:pt-0">
                <span className="text-xs font-medium text-slate-500 md:text-[13px]">
                  {countLabel(category.children.length)}
                </span>
                <span className={`${arrowChip} md:hidden`}>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </span>
              </span>
              <span className="mt-auto hidden items-center gap-2 pt-3 text-[13px] font-bold text-brand-red-600 md:inline-flex">
                Découvrir
                <span className={`${arrowChip} transition group-hover:translate-x-1`}>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
