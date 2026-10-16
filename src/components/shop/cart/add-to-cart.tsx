"use client";

import { useEffect, useRef, useState } from "react";
import { BagIcon } from "../icons";
import { useCart, type CartItem } from "./cart-provider";

/** Quantity stepper + "add to cart" on the product page. */
export function AddToCart({ item, inStock, max }: { item: Omit<CartItem, "qty">; inStock: boolean; max: number }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const ceiling = max > 0 ? max : 1;
  const bump = (delta: number) => setQty((q) => Math.min(ceiling, Math.max(1, q + delta)));

  const onAdd = () => {
    add(item, qty);
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 2200);
  };

  if (!inStock) {
    return (
      <button
        type="button"
        disabled
        className="mt-6 flex h-14 w-full cursor-not-allowed items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-400"
      >
        Rupture de stock
      </button>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <div className="flex h-14 items-center rounded-full border border-slate-200 bg-white px-1.5">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={qty <= 1}
          aria-label="Diminuer la quantité"
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-brand-navy transition hover:bg-slate-100 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-8 text-center text-base font-bold text-brand-navy" aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          onClick={() => bump(1)}
          disabled={qty >= ceiling}
          aria-label="Augmenter la quantité"
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-brand-navy transition hover:bg-slate-100 disabled:opacity-30"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-full bg-brand-red-600 px-6 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-red-700 active:scale-[0.99]"
      >
        <BagIcon className="h-5 w-5" />
        {justAdded ? "Ajouté au panier ✓" : "Ajouter au panier"}
      </button>
    </div>
  );
}
