"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ShopBanner } from "@/data/storefront";

function BannerLink({ href, className, children, label }: { href: string; className: string; children: ReactNode; label?: string }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} aria-label={label} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** The whole card is the image — no button, no padding; the uploaded artwork carries the message. */
function BannerCard({ banner }: { banner: ShopBanner }) {
  return (
    <BannerLink
      href={banner.linkUrl}
      label={banner.title}
      className="group block overflow-hidden rounded-2xl shadow-soft ring-1 ring-slate-200/70"
    >
      <Image
        src={banner.imageUrl}
        alt={banner.title}
        width={banner.imageWidth}
        height={banner.imageHeight}
        sizes="(min-width: 1024px) 50vw, (min-width: 640px) 80vw, 88vw"
        className="block h-auto w-full object-cover transition duration-300 group-hover:scale-[1.02]"
      />
    </BannerLink>
  );
}

export function PromoBanners({ banners }: { banners: ShopBanner[] }) {
  const track = useRef<HTMLDivElement>(null);
  // null until mounted: the server HTML and first client render must match.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Re-check at the next deadline so an expired offer disappears on time.
  useEffect(() => {
    if (now === null) return;
    const upcoming = banners
      .map((b) => (b.endsAt ? new Date(b.endsAt).getTime() - now : Infinity))
      .filter((ms) => ms > 0 && ms < 2 ** 31 - 1);
    if (upcoming.length === 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(...upcoming) + 500);
    return () => window.clearTimeout(timer);
  }, [banners, now]);

  const visible = now === null ? banners : banners.filter((b) => !b.endsAt || new Date(b.endsAt).getTime() > now);

  // Auto-advance the carousel (paused on hover / hidden tab / reduced-motion), looping back at the end.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (el.scrollWidth <= el.clientWidth + 4) return; // nothing to scroll

    let paused = false;
    const pause = () => (paused = true);
    const resume = () => (paused = false);
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", resume);

    const id = window.setInterval(() => {
      if (paused || document.hidden) return;
      const firstChild = el.firstElementChild as HTMLElement | null;
      const step = firstChild ? firstChild.clientWidth + 16 : el.clientWidth; // card width + gap-4
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, 4500);

    return () => {
      window.clearInterval(id);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
    };
  }, [visible.length]);

  if (visible.length === 0) return null;

  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  };
  const arrow =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl text-brand-navy shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50";

  return (
    <section className="mx-auto max-w-7xl px-4 pt-8" aria-label="Offres du moment">
      <div className="relative">
        {visible.length > 2 && (
          <button type="button" aria-label="Offres précédentes" onClick={() => scroll(-1)} className={`${arrow} -left-4 md:flex`}>
            ‹
          </button>
        )}
        <div
          ref={track}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((banner) => (
            <div key={banner.id} className="w-[88%] shrink-0 snap-start sm:w-[80%] lg:w-[calc(50%-0.5rem)]">
              <BannerCard banner={banner} />
            </div>
          ))}
        </div>
        {visible.length > 2 && (
          <button type="button" aria-label="Offres suivantes" onClick={() => scroll(1)} className={`${arrow} -right-4 md:flex`}>
            ›
          </button>
        )}
      </div>
    </section>
  );
}
