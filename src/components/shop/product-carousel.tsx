"use client";

import { useRef, type ReactNode } from "react";

export function ProductCarousel({ label, children }: { label: string; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const arrow = "absolute top-1/3 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-brand-navy shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 md:flex";

  return (
    <div className="relative" role="region" aria-label={label}>
      <button type="button" aria-label="Produits précédents" onClick={() => scroll(-1)} className={`${arrow} -left-4`}>
        ‹
      </button>
      <div
        ref={track}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button type="button" aria-label="Produits suivants" onClick={() => scroll(1)} className={`${arrow} -right-4`}>
        ›
      </button>
    </div>
  );
}
