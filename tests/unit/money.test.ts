import { describe, expect, it } from "vitest";
import { formatDh, formatMinorUnits, sumMinorUnits, toMajorUnits, toMinorUnits } from "@/lib/money";

describe("money", () => {
  it("converts major units to minor units", () => {
    expect(toMinorUnits(199.9)).toBe(19990);
  });

  it("converts minor units back to major units", () => {
    expect(toMajorUnits(19990)).toBe(199.9);
  });

  it("sums a list of minor-unit amounts exactly", () => {
    expect(sumMinorUnits([19990, 5000, 10])).toBe(25000);
  });

  it("formats minor units as dirhams with space grouping", () => {
    expect(formatMinorUnits(549000)).toBe("5 490,00 DH");
  });

  it("formats whole dirham amounts without decimals", () => {
    expect(formatDh(6000)).toBe("6 000 DH");
  });
});
