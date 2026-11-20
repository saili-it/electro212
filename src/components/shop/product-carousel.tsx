"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

/**
 * Horizontal product rail. The section heading sits on the left of the header
 * row and the prev/next arrows on the right (they dim at either end).
 */
export function ProductCarousel({
  label,
  heading,
  children,
}: {
  label: string;
  heading?: ReactNode;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const arrow =
    "bg-white text-brand-dark shadow-sm ring-1 ring-slate-200 disabled:text-slate-300 disabled:shadow-none";

  return (
    <div role="region" aria-label={label}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">{heading}</div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-label="Produits précédents"
            onClick={() => scroll(-1)}
            disabled={!canPrev}
            className={`flex h-10 w-10 items-center justify-center rounded-md transition enabled:hover:bg-brand-dark enabled:hover:text-white ${arrow}`}
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label="Produits suivants"
            onClick={() => scroll(1)}
            disabled={!canNext}
            className={`flex h-10 w-10 items-center justify-center rounded-md transition enabled:hover:bg-brand-dark enabled:hover:text-white ${arrow}`}
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>
      <div
        ref={track}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
