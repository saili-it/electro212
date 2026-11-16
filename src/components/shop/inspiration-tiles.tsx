import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Lifestyle photos (Unsplash, free licence) stored in /public/home.
const TILES = [
  {
    slug: "gros-electromenager",
    image: "/home/cuisine-equipee.jpg",
    eyebrow: "Gros électroménager",
    title: "Une cuisine bien équipée",
    text: "Réfrigérateurs, cuisinières, lave-linge…",
  },
  {
    slug: "encastrable",
    image: "/home/encastrable.jpg",
    eyebrow: "Encastrable",
    title: "L'élégance de l'encastrable",
    text: "Fours, plaques et hottes intégrés.",
  },
  {
    slug: "confort-de-la-maison",
    image: "/home/confort-maison.jpg",
    eyebrow: "Confort de la maison",
    title: "Le confort toute l'année",
    text: "Climatiseurs, chauffages, ventilateurs.",
  },
];

/** Three large photo tiles that lead to main categories. Tiles whose category no longer exists are skipped. */
export function InspirationTiles({ categorySlugs }: { categorySlugs: Set<string> }) {
  const tiles = TILES.filter((tile) => categorySlugs.has(tile.slug));
  if (tiles.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-14" aria-labelledby="inspiration-title">
      <h2 id="inspiration-title" className="mb-5 text-xl font-extrabold tracking-tight text-brand-dark sm:text-2xl">
        Inspirez-vous
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.slug}>
            <Link
              href={`/categories/${tile.slug}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200 md:aspect-[4/5] lg:aspect-[4/3]"
            >
              <Image
                src={tile.image}
                alt=""
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-white/80">{tile.eyebrow}</span>
                  <span className="mt-1 block text-xl font-extrabold leading-tight">{tile.title}</span>
                  <span className="mt-1 block text-sm text-white/85">{tile.text}</span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-dark transition group-hover:bg-brand-red-600 group-hover:text-white">
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
