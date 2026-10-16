import { updateTag } from "next/cache";

/** Every cached storefront read is tagged with this; the catalogue is small enough for one tag. */
export const CATALOG_TAG = "catalog";

/**
 * Call from admin Server Actions after any catalogue write, so the next
 * storefront request sees the change instead of a stale cached copy.
 */
export function refreshStorefront() {
  updateTag(CATALOG_TAG);
}
