import { siteConfig } from "@/config/site";

/*
 * Storefront tracking helpers (browser only): every helper sends the Meta Pixel event AND the matching
 * GA4 e-commerce event to Google Tag Manager's dataLayer (GA4 itself is configured inside GTM).
 * Meta's server-side copy comes from Meta's hosted Conversions API: no token, no API route here.
 *
 * Rules every event follows:
 *  - the product identifier is the product id (cuid) — the same everywhere (Meta content_ids, GA4 item_id);
 *  - prices/totals are numbers in MAD (centimes / 100), currency "MAD";
 *  - no personal data (name, phone, email, address) is ever sent;
 *  - tracking never throws: on the server, without the pixel/GTM, or on any error, it's a no-op.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Pixel / dataset id. NEXT_PUBLIC_* is inlined at build time (Docker: build argument); the id in site
 * config is the fallback that keeps production tracking when the variable isn't set.
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || siteConfig.metaPixelId;

/** Google Tag Manager container id (same build-time / site-config fallback pattern). */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || siteConfig.gtmId;

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

// ---------- Meta Pixel transport ----------

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

/** Sends one Meta standard event. `eventId` is used for deduplication with the server-side (CAPI) copy. */
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

/**
 * Resolves when the browser has finished sending the Meta hit for `event` (seen through the Resource
 * Timing API), or after `timeoutMs` — whichever comes first. Resolves at once when the pixel isn't
 * loaded (blocked, disabled): nothing would be sent, so there's nothing to wait for. Never rejects.
 */
function waitForPixelHit(event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof window.fbq !== "function" || typeof PerformanceObserver === "undefined") {
      resolve();
      return;
    }
    let observer: PerformanceObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      observer?.disconnect();
      if (timer) clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(finish, timeoutMs);
    try {
      observer = new PerformanceObserver((list) => {
        if (list.getEntries().some((e) => e.name.includes("facebook.com/tr") && e.name.includes(`ev=${event}`))) finish();
      });
      observer.observe({ type: "resource" });
    } catch {
      finish();
    }
  });
}

// ---------- GA4 via Google Tag Manager ----------

/** Pushes one entry to GTM's dataLayer. E-commerce events first clear the previous `ecommerce` object (GA4 rule). */
function pushDataLayer(entry: Params, ecommerce = false): void {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    if (ecommerce) window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push(entry);
  } catch {
    // never let tracking break the page
  }
}

function ga4Ecommerce(event: string, items: TrackItem[], extra: Params = {}, value?: number) {
  pushDataLayer(
    {
      event,
      ecommerce: {
        currency: CURRENCY,
        value: round2(value ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0)),
        ...extra,
        items: items.map((i) => ({
          item_id: i.id,
          ...(i.name ? { item_name: i.name } : {}),
          ...(i.category ? { item_category: i.category } : {}),
          price: i.price,
          quantity: i.quantity,
        })),
      },
    },
    true,
  );
}

// ---------- product events ----------

/** One line of a product event: product id, quantity, unit price in MAD (+ name/category when known). */
export type TrackItem = { id: string; quantity: number; price: number; name?: string; category?: string | null };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Shared Meta payload for product events (content_ids, contents, num_items, value, currency). */
export function productPayload(items: TrackItem[]) {
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
export function cartToMetaItems(items: { id: string; name?: string; qty: number; priceMinorUnits: number }[]): TrackItem[] {
  return items.map((i) => ({ id: i.id, name: i.name, quantity: i.qty, price: toMad(i.priceMinorUnits) }));
}

/** Client-side navigation: Meta PageView + a GTM `virtual_page_view` (the first load is tracked by the base codes). */
export function pageView() {
  track("PageView");
  if (typeof window === "undefined") return;
  try {
    pushDataLayer({
      event: "virtual_page_view",
      page_location: window.location.href,
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
    });
  } catch {
    // never let tracking break the page
  }
}

export function viewContent(product: { id: string; name: string; category?: string | null; price: number }) {
  track("ViewContent", {
    ...productPayload([{ id: product.id, quantity: 1, price: product.price }]),
    content_name: product.name,
    ...(product.category ? { content_category: product.category } : {}),
  });
  ga4Ecommerce("view_item", [{ id: product.id, name: product.name, category: product.category, quantity: 1, price: product.price }]);
}

export function search(query: string) {
  track("Search", { search_string: query });
  pushDataLayer({ event: "search", search_term: query });
}

export function addToCart(product: { id: string; name: string; price: number }, qty: number) {
  track("AddToCart", {
    ...productPayload([{ id: product.id, quantity: qty, price: product.price }]),
    content_name: product.name,
  });
  ga4Ecommerce("add_to_cart", [{ id: product.id, name: product.name, quantity: qty, price: product.price }]);
}

export function initiateCheckout(items: TrackItem[]) {
  track("InitiateCheckout", productPayload(items));
  ga4Ecommerce("begin_checkout", items);
}

/**
 * AddPaymentInfo (Meta) + add_payment_info (GA4). Returns a promise that resolves once the browser has
 * finished sending the Meta hit — at most `waitMs` later — so the caller can hold a navigation until the
 * event is safely out. Never rejects.
 */
export function addPaymentInfo(items: TrackItem[], paymentType?: string, waitMs = 1000): Promise<void> {
  try {
    const sent = waitForPixelHit("AddPaymentInfo", waitMs); // observe before sending, so the hit can't be missed
    track("AddPaymentInfo", { ...productPayload(items), ...(paymentType ? { payment_type: paymentType } : {}) });
    ga4Ecommerce("add_payment_info", items, paymentType ? { payment_type: paymentType } : {});
    return sent;
  } catch {
    return Promise.resolve();
  }
}

/**
 * Purchase. `value` is the order total (shipping included), not the sum of lines. Meta: the order id is
 * the event id (deduplicated); GA4: the order reference is the transaction_id (deduplicated by GA4).
 */
export function purchase(order: { orderId: string; reference: string; items: TrackItem[]; total: number }) {
  track(
    "Purchase",
    { ...productPayload(order.items), value: round2(order.total), order_id: order.reference },
    order.orderId,
  );
  ga4Ecommerce("purchase", order.items, { transaction_id: order.reference }, order.total);
}

export type ContactMethod = "whatsapp" | "phone" | "email";

/**
 * A lead: the visitor reached out by WhatsApp, phone or e-mail. Meta `Contact` + GA4 `generate_lead`
 * (not an e-commerce event, so no `ecommerce: null` reset). `source` says where the click happened
 * (e.g. "contact_form", "product_page", "header"); GA4 gets "link" when it's unknown.
 */
export function contact(method: ContactMethod, source?: string) {
  track("Contact", { contact_method: method, ...(source ? { lead_source: source } : {}) });
  pushDataLayer({ event: "generate_lead", contact_method: method, lead_source: source ?? "link" });
}

/** Classifies a link as a contact action: `tel:` → phone; `mailto:` → e-mail; wa.me / api.whatsapp.com / whatsapp: → WhatsApp. */
export function contactMethodOf(href: string): ContactMethod | null {
  const h = href.trim().toLowerCase();
  if (h.startsWith("tel:")) return "phone";
  if (h.startsWith("mailto:")) return "email";
  if (h.startsWith("whatsapp:")) return "whatsapp";
  try {
    const host = new URL(h).hostname;
    if (host === "wa.me" || host === "api.whatsapp.com" || host === "web.whatsapp.com") return "whatsapp";
  } catch {
    // relative or malformed URL — not a contact link
  }
  return null;
}

/** Lead source for a contact link outside the header/footer, from the page it's on (undefined = unknown). */
export function contactSourceOfPath(pathname: string): string | undefined {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/produits/")) return "product_page";
  if (pathname.startsWith("/commande/confirmation")) return "order_confirmation";
  if (pathname.startsWith("/commande")) return "checkout";
  if (pathname.startsWith("/panier")) return "cart";
  if (pathname.startsWith("/contact")) return "contact_page";
  return undefined;
}
