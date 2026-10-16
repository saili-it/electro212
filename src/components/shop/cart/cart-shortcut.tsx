"use client";

import Link from "next/link";
import { BagIcon } from "../icons";
import { useCart } from "./cart-provider";

/** The header's cart link, with a live item-count badge. Mirrors HeaderShortcut's layout. */
export function CartShortcut() {
  const { count, hydrated } = useCart();
  const show = hydrated && count > 0;

  return (
    <Link
      href="/panier"
      className="group flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 xl:flex-row xl:gap-2.5"
      aria-label={show ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}
    >
      <span className="relative text-brand-navy transition group-hover:text-brand-red-600">
        <BagIcon className="h-6 w-6" />
        {show && (
          <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="hidden text-left leading-tight xl:block">
        <span className="block text-sm font-semibold text-brand-navy">Panier</span>
      </span>
      <span className="text-[11px] font-medium text-slate-600 xl:hidden">Panier</span>
    </Link>
  );
}
