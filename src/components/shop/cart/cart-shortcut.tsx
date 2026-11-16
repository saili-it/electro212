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
      className="group flex flex-col items-center gap-0.5"
      aria-label={show ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}
    >
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white transition group-hover:bg-white group-hover:text-brand-red-600">
        <BagIcon className="h-5 w-5" />
        {show && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold leading-none text-brand-red-700 ring-2 ring-brand-red-600">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="hidden text-xs font-medium text-white lg:block">Panier</span>
    </Link>
  );
}
