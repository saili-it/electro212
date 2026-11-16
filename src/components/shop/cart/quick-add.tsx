"use client";

import { useEffect, useRef, useState } from "react";
import { BagIcon } from "../icons";
import { useCart, type CartItem } from "./cart-provider";

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

/**
 * "Add one to cart" for product cards; turns green with a check for a moment
 * after a click. `variant="button"` is the full-width labelled button at the
 * bottom of a card, `variant="icon"` a compact round button.
 */
export function QuickAdd({
  item,
  variant = "icon",
  className = "",
}: {
  item: Omit<CartItem, "qty">;
  variant?: "icon" | "button";
  className?: string;
}) {
  const { add } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleClick = () => {
    add(item, 1);
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 1800);
  };
  const label = justAdded ? `${item.name} ajouté au panier` : `Ajouter ${item.name} au panier`;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className={`flex h-10 w-full items-center justify-center gap-2 rounded-full text-[13px] font-bold transition duration-200 ${
          justAdded ? "bg-brand-green-700 text-white" : "bg-brand-red-600 text-white hover:bg-brand-red-700"
        } ${className}`}
      >
        {justAdded ? <CheckMark /> : <BagIcon className="h-4 w-4" />}
        {justAdded ? (
          "Ajouté"
        ) : (
          <>
            <span className="sm:hidden">Ajouter</span>
            <span className="hidden sm:inline">Ajouter au panier</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition duration-200 hover:scale-110 ${
        justAdded ? "bg-brand-green-700" : "bg-brand-red-600 hover:bg-brand-red-700"
      } ${className}`}
    >
      {justAdded ? <CheckMark /> : <BagIcon className="h-4 w-4" />}
    </button>
  );
}
