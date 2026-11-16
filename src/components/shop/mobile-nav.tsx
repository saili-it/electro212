"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MenuCategory } from "@/data/storefront";
import { CategoryIcon } from "./category-icon";
import { MenuIcon } from "./icons";

function Chevron({ dir, className = "h-5 w-5" }: { dir: "left" | "right"; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-6 w-6" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const closeBtn = "flex h-10 w-10 shrink-0 items-center justify-center text-slate-700 transition hover:bg-slate-100";
const rootRow = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] font-semibold text-slate-800 transition hover:bg-slate-50";
// Square icon tile, as in the desktop menu.
const iconTile = "flex h-10 w-10 shrink-0 items-center justify-center bg-surface text-brand-dark";
const boldRow = "block border-b border-slate-100 px-4 py-3.5 text-[15px] font-bold text-slate-900 transition hover:bg-slate-50";

/**
 * Electroplanet-style mobile menu: a full-height drawer from the left. Level 1
 * lists the categories (with line icons) and quick links; picking a category
 * slides to level 2, where its sub-categories are bold group headings with
 * their own sub-categories listed underneath.
 */
export function MobileNav({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  // `activeId` drives the slide; `panelId` keeps level-2 content rendered while it slides back out.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  // Close on navigation (also covers browser back/forward while the drawer is open).
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
    setActiveId(null);
  }

  // preventScroll everywhere: focusing an element that is still mid-slide would otherwise
  // scroll the drawer to reveal it and knock the panels out of alignment.
  const close = () => {
    setOpen(false);
    setActiveId(null);
    triggerRef.current?.focus({ preventScroll: true });
  };

  // Lock page scroll, close on Escape, and move focus into the drawer.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveId(null);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (activeId) backRef.current?.focus({ preventScroll: true });
  }, [activeId]);

  const panel = categories.find((c) => c.id === panelId) ?? null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu des catégories"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center text-white transition hover:bg-white/15 lg:hidden"
      >
        <MenuIcon />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="animate-backdrop-in absolute inset-0 bg-black/45" onClick={close} aria-hidden />

            {/* overflow-clip (not hidden): a clipped box can't be scrolled by focus(), so panels stay aligned. */}
            <div className="animate-drawer-in absolute inset-y-0 left-0 w-[86%] max-w-sm overflow-clip bg-white shadow-2xl">
              <div
                className={`flex h-full w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  activeId ? "-translate-x-1/2" : "translate-x-0"
                }`}
              >
                {/* Level 1: categories + quick links */}
                <div className="flex h-full w-1/2 flex-col" inert={activeId !== null}>
                  <div className="flex items-center justify-between border-b border-slate-100 py-2 pl-4 pr-2">
                    <span className="text-sm font-extrabold uppercase tracking-wider text-brand-dark">Menu</span>
                    <button ref={closeRef} type="button" onClick={close} aria-label="Fermer le menu" className={closeBtn}>
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto overscroll-contain">
                    <ul className="py-2">
                      {categories.map((category) => (
                        <li key={category.id}>
                          {category.children.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPanelId(category.id);
                                setActiveId(category.id);
                              }}
                              className={rootRow}
                            >
                              <span className={iconTile}>
                                <CategoryIcon slug={category.slug} className="h-[22px] w-[22px]" />
                              </span>
                              <span className="flex-1 leading-snug">{category.name}</span>
                              <Chevron dir="right" className="h-4 w-4 shrink-0 text-slate-400" />
                            </button>
                          ) : (
                            <Link href={`/categories/${category.slug}`} onClick={close} className={rootRow}>
                              <span className={iconTile}>
                                <CategoryIcon slug={category.slug} className="h-[22px] w-[22px]" />
                              </span>
                              <span className="flex-1 leading-snug">{category.name}</span>
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                    <ul className="mt-2 border-t border-slate-100">
                      <li>
                        <Link href="/promotions" onClick={close} className={boldRow}>
                          Nos promotions
                        </Link>
                      </li>
                      <li>
                        <Link href="/#brands-title" onClick={close} className={boldRow}>
                          Nos marques
                        </Link>
                      </li>
                      <li>
                        <Link href="/contact" onClick={close} className={boldRow}>
                          Contact
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Level 2: the picked category's sub-categories */}
                <div className="flex h-full w-1/2 flex-col" inert={activeId === null}>
                  {panel && (
                    <>
                      <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-2">
                        <button ref={backRef} type="button" onClick={() => setActiveId(null)} aria-label="Retour au menu" className={closeBtn}>
                          <Chevron dir="left" />
                        </button>
                        <span className="min-w-0 flex-1 truncate text-base font-bold text-brand-dark">{panel.name}</span>
                        <button type="button" onClick={close} aria-label="Fermer le menu" className={closeBtn}>
                          <CloseIcon />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto overscroll-contain">
                        <Link
                          href={`/categories/${panel.slug}`}
                          onClick={close}
                          className="mx-4 mt-4 flex items-center justify-between gap-2 bg-brand-red-50 px-4 py-3 text-sm font-semibold text-brand-red-700"
                        >
                          Voir tout l&apos;univers {panel.name}
                          <Chevron dir="right" className="h-4 w-4 shrink-0" />
                        </Link>
                        <ul className="mt-2">
                          {panel.children.map((child) => (
                            <li key={child.id} className="border-b border-slate-100 px-4 py-2 last:border-0">
                              <Link
                                href={`/categories/${child.slug}`}
                                onClick={close}
                                className="flex items-center gap-3 py-1 text-[15px] font-semibold leading-snug text-slate-900 transition hover:text-brand-red-600"
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-surface text-slate-600">
                                  <CategoryIcon slug={child.slug} className="h-[18px] w-[18px]" />
                                </span>
                                <span className="min-w-0 flex-1">{child.name}</span>
                              </Link>
                              {child.children.length > 0 && (
                                <ul className="mb-1 ml-[17px] mt-1 border-l border-slate-200 pl-[30px]">
                                  {child.children.map((leaf) => (
                                    <li key={leaf.id}>
                                      <Link
                                        href={`/categories/${leaf.slug}`}
                                        onClick={close}
                                        className="block py-1.5 text-sm text-slate-600 transition hover:text-brand-red-600"
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
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
