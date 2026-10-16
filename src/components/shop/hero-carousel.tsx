"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroSlide } from "@/config/home";
import { CategoryIcon } from "./category-icon";

const THEMES: Record<HeroSlide["theme"], { bg: string; accent: string; button: string }> = {
  navy: { bg: "bg-brand-navy", accent: "text-brand-green", button: "bg-brand-red-600 text-white hover:bg-brand-red-700" },
  red: { bg: "bg-brand-red-600", accent: "text-white/80", button: "bg-white text-brand-red-700 hover:bg-brand-red-50" },
  // green-700, not the logo green: white text on #1ab25d is only 2.8:1.
  green: { bg: "bg-brand-green-700", accent: "text-white/80", button: "bg-white text-brand-green-700 hover:bg-brand-green-50" },
};

const INTERVAL_MS = 6000;

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion || slides.length < 2) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, reduceMotion, slides.length]);

  if (slides.length === 0) return null;
  const go = (next: number) => setIndex((next + slides.length) % slides.length);

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="À la une"
      className="group relative h-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => {
          const theme = THEMES[slide.theme];
          const active = i === index;
          return (
            <div
              key={slide.title}
              role="group"
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${slides.length}`}
              aria-hidden={!active}
              inert={!active}
              className={`relative flex w-full shrink-0 items-center overflow-hidden px-8 py-10 text-white sm:px-12 ${theme.bg}`}
            >
              <div className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 text-white/10 sm:right-6">
                <CategoryIcon slug={slide.iconSlug} className="h-72 w-72 sm:h-80 sm:w-80" />
              </div>
              <div className="relative max-w-md">
                <p className={`text-xs font-semibold uppercase tracking-widest sm:text-sm ${theme.accent}`}>{slide.eyebrow}</p>
                <p className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{slide.title}</p>
                <p className="mt-3 text-sm text-white/85 sm:text-base">{slide.text}</p>
                <Link
                  href={`/categories/${slide.cta.categorySlug}`}
                  className={`mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${theme.button}`}
                >
                  {slide.cta.label} <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Diapositive précédente"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow transition hover:bg-white group-hover:flex sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Diapositive suivante"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow transition hover:bg-white group-hover:flex sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-8 flex gap-2 sm:left-12">
            {slides.map((slide, i) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Aller à la diapositive ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${i === index ? "w-7 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
