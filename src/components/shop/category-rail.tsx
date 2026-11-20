import Image from "next/image";
import Link from "next/link";
import type { RailCategory } from "@/data/storefront";
import { CategoryIcon } from "./category-icon";

/**
 * Horizontal strip of round category tiles (store-style "shop by category"), right under the hero.
 * Scrolls sideways on every screen size; each tile shows a real product photo from that category.
 */
export function CategoryRail({ categories: all }: { categories: RailCategory[] }) {
  // A photo-less tile breaks the strip's rhythm; those categories stay reachable from the menu.
  const categories = all.filter((c) => c.imageUrl);
  if (categories.length === 0) return null;
  return (
    <nav aria-label="Catégories" className="mx-auto max-w-7xl px-4 pt-8">
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => (
          <li key={category.id} className="w-[84px] shrink-0 snap-start sm:w-[104px]">
            <Link href={`/categories/${category.slug}`} className="group flex flex-col items-center gap-2 text-center">
              <span className="relative flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-slate-200 transition duration-200 group-hover:ring-4 group-hover:ring-brand-red-600 sm:h-[104px] sm:w-[104px]">
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt=""
                    fill
                    sizes="104px"
                    className="object-contain p-3.5 transition duration-300 group-hover:scale-110"
                  />
                ) : (
                  <CategoryIcon slug={category.slug} className="h-9 w-9 text-brand-dark" />
                )}
              </span>
              <span className="line-clamp-2 font-display text-[15px] font-bold uppercase leading-tight tracking-wide text-brand-dark transition group-hover:text-brand-red-600">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
