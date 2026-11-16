"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MenuCategory } from "@/data/storefront";
import { CategoryIcon } from "./category-icon";
import { MenuIcon } from "./icons";

/**
 * Electroplanet-style vertical mega menu. "Catégories" opens a panel: the
 * left rail lists every universe in an icon tile (hover/focus previews it);
 * the right side shows the previewed universe's sub-categories, each with its
 * own icon and its sub-categories underneath, plus the universe's picture on
 * wide screens. Square corners throughout, like the rest of the nav.
 *
 * The panel is absolutely positioned against the nearest positioned ancestor
 * (the nav bar card), so it spans the whole bar.
 */
export function DesktopCategoryMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(categories[0]?.id ?? null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // Close after navigating.
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // A short grace period so the panel doesn't vanish while the pointer crosses a gap.
  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  };

  const active = categories.find((c) => c.id === activeId) ?? categories[0] ?? null;

  return (
    <div
      ref={wrapperRef}
      className="flex"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="desktop-category-menu"
        className={`flex w-72 items-center gap-3 px-5 text-[15px] font-bold text-brand-red-600 transition ${
          open ? "bg-brand-red-50 shadow-[inset_0_-3px_0_var(--color-brand-red-600)]" : "bg-brand-red-50/70 hover:bg-brand-red-50"
        }`}
      >
        <MenuIcon className="h-6 w-6" />
        Catégories
      </button>

      {open && (
        <div
          id="desktop-category-menu"
          className="animate-fade-up absolute inset-x-4 top-full z-50 flex h-[min(28rem,calc(100vh-14rem))] overflow-hidden border-t border-slate-200 bg-white shadow-2xl"
        >
          {/* Left: the universes, on a grey rail; the previewed one turns white and joins the panel. */}
          <ul className="w-72 shrink-0 overflow-y-auto overscroll-contain bg-surface py-2">
            {categories.map((category) => {
              const isActive = category.id === active?.id;
              return (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    onMouseEnter={() => setActiveId(category.id)}
                    onFocus={() => setActiveId(category.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative flex items-center gap-3 py-2.5 pl-5 pr-4 transition ${
                      isActive ? "bg-white shadow-[inset_3px_0_0_var(--color-brand-red-600)]" : "hover:bg-white/60"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center transition ${
                        isActive ? "bg-brand-red-600 text-white" : "bg-white text-brand-dark ring-1 ring-slate-200"
                      }`}
                    >
                      <CategoryIcon slug={category.slug} className="h-[22px] w-[22px]" />
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-[14.5px] font-semibold leading-snug ${
                        isActive ? "text-brand-red-700" : "text-slate-800"
                      }`}
                    >
                      {category.name}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 ${isActive ? "text-brand-red-600" : "text-slate-300"}`}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right: the previewed universe — its sub-categories, and its picture on wide screens. */}
          <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-8 py-6">
            {active && (
              <>
                <div className="flex items-end justify-between gap-6 border-b border-slate-200 pb-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-red-600">Univers</p>
                    <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-brand-dark">{active.name}</p>
                  </div>
                  <Link
                    href={`/categories/${active.slug}`}
                    className="inline-flex shrink-0 items-center gap-2 bg-brand-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-red-700"
                  >
                    Voir tout l&apos;univers
                    <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </Link>
                </div>

                <div className="flex items-start gap-8 pt-5">
                  {active.children.length > 0 ? (
                    // CSS columns: the list flows down each column, so a group with its own items stays compact.
                    <ul className={`min-w-0 flex-1 gap-x-6 ${active.children.length > 8 ? "columns-3" : "columns-2"}`}>
                      {active.children.map((child) => (
                        <li key={child.id} className="mb-1 break-inside-avoid">
                          <Link href={`/categories/${child.slug}`} className="group/item flex items-center gap-3 py-1.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-surface text-slate-600 transition group-hover/item:bg-brand-red-600 group-hover/item:text-white">
                              <CategoryIcon slug={child.slug} className="h-[18px] w-[18px]" />
                            </span>
                            <span className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-slate-800 transition group-hover/item:text-brand-red-700">
                              {child.name}
                            </span>
                          </Link>
                          {child.children.length > 0 && (
                            <ul className="mb-2 ml-[17px] mt-0.5 border-l border-slate-200 pl-[30px]">
                              {child.children.map((leaf) => (
                                <li key={leaf.id}>
                                  <Link
                                    href={`/categories/${leaf.slug}`}
                                    className="block py-1 text-[13.5px] leading-snug text-slate-600 transition hover:text-brand-red-600"
                                  >
                                    {leaf.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-slate-600">
                      Découvrez tous les produits de cet univers.
                    </p>
                  )}

                  {active.imageUrl && (
                    <Link
                      href={`/categories/${active.slug}`}
                      tabIndex={-1}
                      aria-hidden
                      className="group/feat hidden w-52 shrink-0 bg-surface p-4 xl:block"
                    >
                      <span className="block aspect-[4/3] overflow-hidden bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin-provided address, host not known in advance */}
                        <img
                          src={active.imageUrl}
                          alt=""
                          className="h-full w-full object-contain p-2 transition duration-300 group-hover/feat:scale-105"
                        />
                      </span>
                      <span className="mt-3 block text-[15px] font-extrabold leading-snug text-brand-dark">{active.name}</span>
                      <span className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-red-600">
                        Voir les produits
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover/feat:translate-x-0.5" strokeWidth={2.5} aria-hidden />
                      </span>
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
