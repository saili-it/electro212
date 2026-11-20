import { siteConfig } from "@/config/site";

/*
 * Meta Pixel tracking helpers (browser only). Server-side events are mirrored by Meta's hosted
 * Conversions API, so this file only talks to the browser pixel: no token, no API route.
 *
 * Rules every event follows:
 *  - the product identifier is the product id (cuid) — the same everywhere (cart, checkout, order);
 *  - prices/totals are numbers in MAD (centimes / 100), currency "MAD";
 *  - no personal data (name, phone, email, address) is ever sent;
 *  - tracking never throws: on the server, without the pixel, or on any error, it's a no-op.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Pixel / dataset id. NEXT_PUBLIC_* is inlined at build time; the Docker build doesn't see `.env*`
 * files, so the id in site config is the fallback that keeps production tracking.
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || siteConfig.metaPixelId;

const CURRENCY = "MAD";

/** Centimes → MAD, as a number (549000 → 5490). */
export const toMad = (minorUnits: number) => Math.round(minorUnits) / 100;

type Params = Record<string, unknown>;

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // randomUUID needs a secure context; fall back to a random string elsewhere.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/*
 * The pixel base code loads `afterInteractive` (after hydration), but some events fire on mount
 * (ViewContent, InitiateCheckout…). Those are held here and sent as soon as `fbq` exists, for up
 * to ~15 s; after that they're dropped (e.g. the pixel is blocked by an ad blocker).
 */
const pending: [string, Params, string][] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushTries = 0;

function send(event: string, params: Params, eventId: string) {
  try {
    window.fbq?.("track", event, params, { eventID: eventId });
  } catch {
    // never let tracking break the page
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTries = 0;
  flushTimer = setInterval(() => {
    flushTries += 1;
    if (typeof window.fbq === "function") {
      for (const [event, params, eventId] of pending.splice(0)) send(event, params, eventId);
    }
    if (pending.length === 0 || flushTries >= 60) {
      pending.length = 0;
      if (flushTimer) clearInterval(flushTimer);
      flushTimer = null;
    }
  }, 250);
}

/** Sends one standard event. `eventId` is used for deduplication with the server-side (CAPI) copy. */
export function track(event: string, params: Params = {}, eventId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const id = eventId ?? newEventId();
    if (typeof window.fbq === "function") {
      send(event, params, id);
    } else {
      pending.push([event, params, id]);
      scheduleFlush();
    }
  } catch {
    // never let tracking break the page
  }
}

// ---------- product events ----------

/** One line of a product event: product id, quantity, unit price in MAD. */
export type MetaItem = { id: string; quantity: number; price: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Shared payload for product events (content_ids, contents, num_items, value, currency). */
export function productPayload(items: MetaItem[]) {
  return {
    content_type: "product",
    content_ids: items.map((i) => i.id),
    contents: items.map((i) => ({ id: i.id, quantity: i.quantity, item_price: i.price })),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
    value: round2(items.reduce((sum, i) => sum + i.price * i.quantity, 0)),
    currency: CURRENCY,
  };
}

/** Cart lines (centimes) → event items (MAD). */
export function cartToMetaItems(items: { id: string; qty: number; priceMinorUnits: number }[]): MetaItem[] {
  return items.map((i) => ({ id: i.id, quantity: i.qty, price: toMad(i.priceMinorUnits) }));
}

export function viewContent(product: { id: string; name: string; category?: string | null; price: number }) {
  track("ViewContent", {
    ...productPayload([{ id: product.id, quantity: 1, price: product.price }]),
    content_name: product.name,
    ...(product.category ? { content_category: product.category } : {}),
  });
}

export function search(query: string) {
  track("Search", { search_string: query });
}

export function addToCart(product: { id: string; name: string; price: number }, qty: number) {
  track("AddToCart", {
    ...productPayload([{ id: product.id, quantity: qty, price: product.price }]),
    content_name: product.name,
  });
}

export function initiateCheckout(items: MetaItem[]) {
  track("InitiateCheckout", productPayload(items));
}

export function addPaymentInfo(items: MetaItem[], paymentType?: string) {
  track("AddPaymentInfo", { ...productPayload(items), ...(paymentType ? { payment_type: paymentType } : {}) });
}

/**
 * Purchase. `value` is the order total (shipping included), not the sum of lines. The order id is the
 * event id, so a re-fire (refresh, second tab) is deduplicated by Meta.
 */
export function purchase(order: { orderId: string; reference: string; items: MetaItem[]; total: number }) {
  track(
    "Purchase",
    { ...productPayload(order.items), value: round2(order.total), order_id: order.reference },
    order.orderId,
  );
}

export type ContactMethod = "whatsapp" | "phone";

export function contact(method: ContactMethod) {
  track("Contact", { contact_method: method });
}

/** Classifies a link as a contact action: `tel:` → phone; wa.me / api.whatsapp.com / whatsapp: → WhatsApp. */
export function contactMethodOf(href: string): ContactMethod | null {
  const h = href.trim().toLowerCase();
  if (h.startsWith("tel:")) return "phone";
  if (h.startsWith("whatsapp:")) return "whatsapp";
  try {
    const host = new URL(h).hostname;
    if (host === "wa.me" || host === "api.whatsapp.com" || host === "web.whatsapp.com") return "whatsapp";
  } catch {
    // relative or malformed URL — not a contact link
  }
  return null;
}
