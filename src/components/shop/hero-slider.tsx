"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ShopBanner } from "@/data/storefront";

const INTERVAL_MS = 6000;

function SlideLink({ slide, children }: { slide: ShopBanner; children: React.ReactNode }) {
  const className = "relative block h-full w-full";
  if (slide.linkUrl.startsWith("/")) {
    return (
      <Link href={slide.linkUrl} className={className} aria-label={slide.title}>
        {children}
      </Link>
    );
  }
  return (
    <a href={slide.linkUrl} className={className} aria-label={slide.title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** Headline / subtitle / button overlay on a hero slide. The button is a styled span (the whole slide is the link). */
function SlideOverlay({ slide }: { slide: ShopBanner }) {
  // Only show the overlay when there's a title/subtitle; otherwise the image speaks for itself.
  if (!slide.headline && !slide.subtitle) return null;
  return (
    <>
      {/* Gradient for legibility — stronger on the left where the text sits. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-3 px-6 text-white sm:px-10 lg:px-12">
          {slide.headline && (
            <p className="max-w-xl text-2xl font-extrabold leading-tight drop-shadow-sm sm:text-4xl lg:text-5xl">
              {slide.headline}
            </p>
          )}
          {slide.subtitle && <p className="max-w-lg text-sm text-white/90 sm:text-lg">{slide.subtitle}</p>}
          {slide.ctaLabel && (
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition group-hover:bg-brand-red-700">
              {slide.ctaLabel} <span aria-hidden>→</span>
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/** Full-width image carousel for admin-managed hero banners (placement = HERO). */
export function HeroSlider({ slides }: { slides: ShopBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    const t = window.setTimeout(() => setNow(Date.now()), 0);
    return () => {
      query.removeEventListener("change", update);
      window.clearTimeout(t);
    };
  }, []);

  // Drop slides whose end time has passed (server HTML already filtered; this covers a tab left open).
  const visible = now === null ? slides : slides.filter((s) => !s.endsAt || new Date(s.endsAt).getTime() > now);
  const count = visible.length;
  const current = count > 0 ? index % count : 0;

  useEffect(() => {
    if (paused || reduceMotion || count < 2) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [current, paused, reduceMotion, count]);

  if (count === 0) return null;
  const go = (next: number) => setIndex((next + count) % count);

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="À la une"
      className="group relative h-full overflow-hidden bg-slate-100"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {visible.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${count}`}
            aria-hidden={i !== current}
            inert={i !== current}
            className="relative h-full w-full shrink-0"
          >
            <SlideLink slide={slide}>
              <Image
                src={slide.imageUrl}
                alt={slide.title}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover transition duration-700 group-hover:scale-[1.02]"
              />
              <SlideOverlay slide={slide} />
            </SlideLink>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label="Diapositive précédente"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow transition hover:bg-white group-hover:flex sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label="Diapositive suivante"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow transition hover:bg-white group-hover:flex sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {visible.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Aller à la diapositive ${i + 1}`}
                aria-current={i === current}
                className={`h-2 rounded-full transition-all ${i === current ? "w-7 bg-white" : "w-2 bg-white/60 hover:bg-white/90"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
