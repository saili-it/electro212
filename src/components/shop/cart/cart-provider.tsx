"use client";

import { useSyncExternalStore } from "react";

/*
 * Client-side cart (localStorage). It collects the items a visitor wants so
 * they can be sent to the team — the order is finalised over WhatsApp/phone.
 * Server-side checkout with live stock reservation is a later phase; this
 * persistence layer swaps to the server then, the UI stays.
 *
 * Backed by a module-level store read through useSyncExternalStore, which is
 * the React-recommended way to subscribe to an external source (localStorage
 * + the cross-tab `storage` event) without hydration mismatches.
 */

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  priceMinorUnits: number;
  imageUrl: string | null;
  qty: number;
};

type CartSnapshot = {
  items: CartItem[];
  /** False until localStorage is read (the first client render) — gate badges/totals on it. */
  hydrated: boolean;
  count: number;
  totalMinorUnits: number;
};

const STORAGE_KEY = "electro212.cart.v1";
const MAX_QTY = 99;
const EMPTY: CartItem[] = [];
// Stable reference for SSR + the pre-hydration client render (matches the server HTML).
const SERVER_SNAPSHOT: CartSnapshot = { items: EMPTY, hydrated: false, count: 0, totalMinorUnits: 0 };

let items: CartItem[] = EMPTY;
let loaded = false;
let snapshot: CartSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.floor(qty)));
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.slug === "string" &&
    typeof v.name === "string" &&
    typeof v.priceMinorUnits === "number" &&
    typeof v.qty === "number" &&
    (v.imageUrl === null || typeof v.imageUrl === "string")
  );
}

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem).map((i) => ({ ...i, qty: clampQty(i.qty) }));
  } catch {
    return [];
  }
}

function recompute() {
  snapshot = {
    items,
    hydrated: loaded,
    count: items.reduce((n, i) => n + i.qty, 0),
    totalMinorUnits: items.reduce((n, i) => n + i.qty * i.priceMinorUnits, 0),
  };
}

function emit() {
  for (const listener of listeners) listener();
}

function setItems(next: CartItem[]) {
  items = next;
  recompute();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full/unavailable (private mode) — the cart still works for this page view
  }
  emit();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // First mount after hydration: load the persisted cart, then notify.
  if (!loaded) {
    loaded = true;
    items = readStorage();
    recompute();
    emit();
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    items = readStorage();
    recompute();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => SERVER_SNAPSHOT;

function add(item: Omit<CartItem, "qty">, qty = 1) {
  const existing = items.find((i) => i.id === item.id);
  setItems(
    existing
      ? items.map((i) => (i.id === item.id ? { ...i, qty: clampQty(i.qty + qty) } : i))
      : [...items, { ...item, qty: clampQty(qty) }],
  );
}

function setQty(id: string, qty: number) {
  setItems(qty <= 0 ? items.filter((i) => i.id !== id) : items.map((i) => (i.id === id ? { ...i, qty: clampQty(qty) } : i)));
}

function remove(id: string) {
  setItems(items.filter((i) => i.id !== id));
}

function clear() {
  setItems([]);
}

export function useCart() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...snap, add, setQty, remove, clear };
}
