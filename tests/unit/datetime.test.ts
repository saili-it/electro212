import { describe, expect, it } from "vitest";
import { dateToShopLocal, formatShopDeadline, shopLocalToDate } from "@/lib/datetime";

describe("shop time zone (Africa/Casablanca)", () => {
  it("converts Moroccan wall-clock time to UTC (UTC+1 outside Ramadan)", () => {
    expect(shopLocalToDate("2026-10-10T23:59")?.toISOString()).toBe("2026-10-10T22:59:00.000Z");
  });

  it("round-trips through the datetime-local format", () => {
    const date = shopLocalToDate("2026-12-31T08:30")!;
    expect(dateToShopLocal(date)).toBe("2026-12-31T08:30");
  });

  it("formats a deadline the way the banner shows it", () => {
    expect(formatShopDeadline(new Date("2026-10-10T22:59:00Z"))).toBe("10/10 à 23h59");
  });

  it("rejects malformed input", () => {
    expect(shopLocalToDate("10/10/2026")).toBeNull();
    expect(shopLocalToDate("")).toBeNull();
  });
});
