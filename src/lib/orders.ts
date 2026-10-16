import type { OrderStatus, PaymentMethod, PaymentStatus, StockMovementType } from "@prisma/client";

/*
 * Pure order domain logic — no DB, no server-only imports, so it's fully
 * unit-testable. The data layer (src/data/orders.ts) applies these decisions
 * inside transactions.
 */

// ---------- Status labels (French storefront + admin) ----------

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: "À confirmer",
  CONFIRMED: "Confirmée",
  PREPARING: "En préparation",
  OUT_FOR_DELIVERY: "En livraison",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  FAILED_DELIVERY: "Échec de livraison",
  RETURNED: "Retournée",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  UNDEFINED: "Non défini",
  CASH_ON_DELIVERY: "Paiement à la livraison",
  BANK_TRANSFER: "Virement bancaire",
  CARD_ONLINE: "Carte en ligne",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  NOT_APPLICABLE: "Sans objet",
  PENDING: "En attente",
  PAID: "Payé",
  FAILED: "Échoué",
  REFUNDED: "Remboursé",
};

// ---------- Status workflow ----------

/** Which status an order may move to next, from the admin. Terminal states have none. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY"],
  FAILED_DELIVERY: ["OUT_FOR_DELIVERY", "CANCELLED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** A free-text motive is mandatory when moving to these (the customer must be told why). */
const REASON_REQUIRED = new Set<OrderStatus>(["CANCELLED", "FAILED_DELIVERY"]);

export function isReasonRequired(to: OrderStatus): boolean {
  return REASON_REQUIRED.has(to);
}

// ---------- Stock effect of each status ----------

/*
 * The inventory "phase" of an order status:
 *   RESERVED — units are held for the order (reservedQuantity), stock not yet deducted.
 *   SOLD     — units left the warehouse (stockQuantity deducted, hold released).
 *   FREE     — no hold and no deduction (cancelled, or delivered-then-returned & restocked).
 *
 * availableStock = stockQuantity - reservedQuantity, so reserving lowers availability
 * without touching physical stock until the order is actually delivered.
 */
export type StockPhase = "RESERVED" | "SOLD" | "FREE";

export const STOCK_PHASE: Record<OrderStatus, StockPhase> = {
  PENDING_CONFIRMATION: "RESERVED",
  CONFIRMED: "RESERVED",
  PREPARING: "RESERVED",
  OUT_FOR_DELIVERY: "RESERVED",
  FAILED_DELIVERY: "RESERVED",
  DELIVERED: "SOLD",
  CANCELLED: "FREE",
  RETURNED: "FREE",
};

const reservedHeld = (phase: StockPhase | null, qty: number) => (phase === "RESERVED" ? qty : 0);
const stockConsumed = (phase: StockPhase | null, qty: number) => (phase === "SOLD" ? qty : 0);

/**
 * How one order line's `qty` changes an Inventory row when the order moves
 * between two phases (`from === null` means the order is being created).
 * stockDelta is added to stockQuantity, reservedDelta to reservedQuantity.
 */
export function stockDeltaForPhase(
  from: StockPhase | null,
  to: StockPhase,
  qty: number,
): { reservedDelta: number; stockDelta: number } {
  return {
    reservedDelta: reservedHeld(to, qty) - reservedHeld(from, qty),
    // stockQuantity falls as units are consumed (sold) and rises when they come back.
    stockDelta: stockConsumed(from, qty) - stockConsumed(to, qty),
  };
}

/** The audit movement type for a phase change, or null when stock is unaffected. */
export function stockMovementTypeForPhase(from: StockPhase | null, to: StockPhase): StockMovementType | null {
  if (from === to) return null;
  if (to === "RESERVED") return "RESERVATION"; // FREE/new → held
  if (from === "RESERVED" && to === "SOLD") return "SALE_DEDUCTION";
  if (from === "RESERVED" && to === "FREE") return "RESERVATION_RELEASE";
  if (from === "SOLD" && to === "FREE") return "RETURN_RESTOCK";
  return "MANUAL_ADJUSTMENT"; // not reachable via ALLOWED_TRANSITIONS
}

// ---------- Order reference ----------

/** Daily, human-readable order number: E212-YYYYMMDD-NNNN (NNNN is that day's sequence). */
export function formatOrderReference(datePart: string, sequence: number): string {
  return `E212-${datePart}-${String(sequence).padStart(4, "0")}`;
}
