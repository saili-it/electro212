"use client";

import { useEffect, useRef } from "react";
import { purchase, search, viewContent, type MetaItem } from "@/lib/meta";

/*
 * Tiny client children that fire one Meta event from a server-rendered page. Each keeps a ref of
 * what it already sent, so re-renders and React strict mode's double effects never send twice.
 */

/** Product page: ViewContent once per product (prices in MAD). */
export function TrackViewContent({ id, name, category, price }: { id: string; name: string; category: string | null; price: number }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === id) return;
    sent.current = id;
    viewContent({ id, name, category, price });
  }, [id, name, category, price]);
  return null;
}

/** Search results: Search on load, and again whenever the query (?q=) changes. */
export function TrackSearch({ query }: { query: string }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (!q || sent.current === q) return;
    sent.current = q;
    search(q);
  }, [query]);
  return null;
}

const PURCHASE_KEY = (orderId: string) => `electro212.meta.purchase.${orderId}`;

/**
 * Order confirmation: Purchase once per order. The order id is the event id (Meta deduplicates),
 * and a localStorage mark stops this browser from re-sending it on refresh or a revisit.
 */
export function TrackPurchase({ orderId, reference, items, total }: { orderId: string; reference: string; items: MetaItem[]; total: number }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    try {
      if (window.localStorage.getItem(PURCHASE_KEY(orderId))) return;
    } catch {
      // storage unavailable (private mode): still send — the event id prevents double counting
    }
    purchase({ orderId, reference, items, total });
    try {
      window.localStorage.setItem(PURCHASE_KEY(orderId), String(Date.now()));
    } catch {
      // ignore
    }
  }, [orderId, reference, items, total]);
  return null;
}
