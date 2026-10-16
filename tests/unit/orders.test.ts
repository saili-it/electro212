import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@prisma/client";
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  formatOrderReference,
  isReasonRequired,
  STOCK_PHASE,
  stockDeltaForPhase,
  stockMovementTypeForPhase,
} from "@/lib/orders";

describe("order status workflow", () => {
  it("allows only the defined forward transitions", () => {
    expect(canTransition("PENDING_CONFIRMATION", "CONFIRMED")).toBe(true);
    expect(canTransition("PENDING_CONFIRMATION", "CANCELLED")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "FAILED_DELIVERY")).toBe(true);
    expect(canTransition("FAILED_DELIVERY", "OUT_FOR_DELIVERY")).toBe(true);
    expect(canTransition("DELIVERED", "RETURNED")).toBe(true);
  });

  it("rejects nonsensical or skipping transitions", () => {
    expect(canTransition("PENDING_CONFIRMATION", "DELIVERED")).toBe(false);
    expect(canTransition("DELIVERED", "PENDING_CONFIRMATION")).toBe(false);
    expect(canTransition("CONFIRMED", "DELIVERED")).toBe(false);
  });

  it("treats CANCELLED and RETURNED as terminal", () => {
    expect(ALLOWED_TRANSITIONS.CANCELLED).toEqual([]);
    expect(ALLOWED_TRANSITIONS.RETURNED).toEqual([]);
  });

  it("requires a reason only for cancellation and failed delivery", () => {
    expect(isReasonRequired("CANCELLED")).toBe(true);
    expect(isReasonRequired("FAILED_DELIVERY")).toBe(true);
    expect(isReasonRequired("CONFIRMED")).toBe(false);
    expect(isReasonRequired("DELIVERED")).toBe(false);
  });

  it("maps every status to a stock phase", () => {
    const statuses = Object.keys(ALLOWED_TRANSITIONS) as OrderStatus[];
    for (const status of statuses) {
      expect(STOCK_PHASE[status]).toBeDefined();
    }
  });
});

describe("stock effect of a phase change", () => {
  it("reserves units when an order is created", () => {
    expect(stockDeltaForPhase(null, "RESERVED", 2)).toEqual({ reservedDelta: 2, stockDelta: 0 });
    expect(stockMovementTypeForPhase(null, "RESERVED")).toBe("RESERVATION");
  });

  it("converts a reservation into a sale on delivery (available stock unchanged)", () => {
    const { reservedDelta, stockDelta } = stockDeltaForPhase("RESERVED", "SOLD", 3);
    expect(reservedDelta).toBe(-3);
    expect(stockDelta).toBe(-3);
    // availableStock = stockQuantity - reservedQuantity: both fall by 3, so net availability is unchanged.
    expect(stockDelta - reservedDelta).toBe(0);
    expect(stockMovementTypeForPhase("RESERVED", "SOLD")).toBe("SALE_DEDUCTION");
  });

  it("releases the hold when an unshipped order is cancelled", () => {
    expect(stockDeltaForPhase("RESERVED", "FREE", 4)).toEqual({ reservedDelta: -4, stockDelta: 0 });
    expect(stockMovementTypeForPhase("RESERVED", "FREE")).toBe("RESERVATION_RELEASE");
  });

  it("restocks when a delivered order is returned", () => {
    expect(stockDeltaForPhase("SOLD", "FREE", 1)).toEqual({ reservedDelta: 0, stockDelta: 1 });
    expect(stockMovementTypeForPhase("SOLD", "FREE")).toBe("RETURN_RESTOCK");
  });

  it("is a no-op when the phase does not change", () => {
    expect(stockDeltaForPhase("RESERVED", "RESERVED", 5)).toEqual({ reservedDelta: 0, stockDelta: 0 });
    expect(stockMovementTypeForPhase("RESERVED", "RESERVED")).toBeNull();
  });
});

describe("order reference", () => {
  it("formats a zero-padded daily sequence", () => {
    expect(formatOrderReference("20261015", 7)).toBe("E212-20261015-0007");
    expect(formatOrderReference("20261015", 1234)).toBe("E212-20261015-1234");
    expect(formatOrderReference("20261015", 12345)).toBe("E212-20261015-12345");
  });
});
