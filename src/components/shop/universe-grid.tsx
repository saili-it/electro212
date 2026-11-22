import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MenuCategory } from "@/data/storefront";
import { CategoryIcon } from "./category-icon";

function countLabel(count: number) {
  if (count === 0) return "Toute la gamme";
  return count === 1 ? "1 catégorie" : `${count} catégories`;
}

// Brand colours only (logo red + green, deep green), alternating so neighbours never match.
const TILE_COLORS = ["bg-brand-red-600", "bg-brand-dark", "bg-brand-green-700", "bg-brand-red-700"];

/**
 * "Nos univers": one bold coloured tile per main category — big condensed title, category count,
 * and the universe picture in a white disc breaking out of the bottom-right corner.
 * 2 columns on phones, 4 from `lg` (one row for the four universes).
 */
export function UniverseGrid({ categories }: { categories: MenuCategory[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {categories.map((category, index) => (
        <li key={category.id}>
          <Link
            href={`/categories/${category.slug}`}
            className={`group relative flex aspect-[4/5] flex-col overflow-hidden rounded-xl p-4 text-white transition duration-200 hover:-translate-y-1 hover:shadow-pop sm:aspect-[5/6] sm:p-5 ${TILE_COLORS[index % TILE_COLORS.length]}`}
          >
            <span className="font-display text-xs font-bold uppercase tracking-[0.22em] text-white/70 sm:text-sm">
              Univers {String(index + 1).padStart(2, "0")}
            </span>
            <span className="relative z-10 mt-1 font-display text-[1.3rem] font-extrabold uppercase leading-[0.92] [overflow-wrap:anywhere] sm:text-[2rem] sm:[overflow-wrap:normal] lg:text-[1.6rem] xl:text-4xl">
              {category.name}
            </span>
            <span className="relative z-10 mt-2 text-xs font-medium text-white/80 sm:text-[13px]">
              {countLabel(category.children.length)}
            </span>

            <span className="relative z-10 mt-auto inline-flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide sm:text-base">
              <span className="hidden sm:inline lg:hidden xl:inline">Découvrir</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={2.5} aria-hidden />
            </span>

            <span className="absolute -bottom-[14%] -right-[14%] flex aspect-square w-[68%] sm:w-[78%] items-center justify-center rounded-full bg-white text-brand-dark shadow-pop transition duration-300 group-hover:scale-105">
              {category.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin-provided address, host not known in advance
                <img
                  src={category.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full -translate-x-[6%] -translate-y-[6%] object-contain p-[20%]"
                />
              ) : (
                <CategoryIcon slug={category.slug} className="h-14 w-14 -translate-x-3 -translate-y-3" />
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
