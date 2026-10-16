"use server";

import { placeOrder, type PlaceOrderResult } from "@/data/orders";
import { refreshStorefront } from "@/lib/cache-tags";

export type CheckoutState = PlaceOrderResult | null;

type RawItem = { productId: string; qty: number };

function parseItems(raw: FormDataEntryValue | null): RawItem[] {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is RawItem => {
        if (typeof entry !== "object" || entry === null) return false;
        const e = entry as Record<string, unknown>;
        return typeof e.productId === "string" && typeof e.qty === "number";
      })
      .map((entry) => ({ productId: entry.productId, qty: entry.qty }));
  } catch {
    return [];
  }
}

/**
 * The storefront checkout. Public by design (guest checkout) — placeOrder()
 * re-prices against the DB and reserves stock atomically, so nothing here
 * trusts the submitted totals. On success the client clears the cart and
 * navigates to the confirmation page using the returned order id.
 */
export async function placeOrderAction(_prevState: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const result = await placeOrder({
    contactName: String(formData.get("contactName") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    mode: String(formData.get("mode") ?? "") as never,
    deliveryCity: String(formData.get("deliveryCity") ?? ""),
    deliveryAddressLine: String(formData.get("deliveryAddressLine") ?? ""),
    deliveryNotes: String(formData.get("deliveryNotes") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
    items: parseItems(formData.get("items")),
  });

  // Reserving stock changed live availability — expire the storefront cache.
  if (result.ok) refreshStorefront();

  return result;
}
