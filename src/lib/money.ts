const MINOR_UNITS_PER_MAJOR_UNIT = 100;

/** Converts a human-entered amount (e.g. "199.90" MAD) to integer minor units (19990). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * MINOR_UNITS_PER_MAJOR_UNIT);
}

/** Converts integer minor units (19990) back to a major-unit number (199.9) for display. */
export function toMajorUnits(minorUnits: number): number {
  return minorUnits / MINOR_UNITS_PER_MAJOR_UNIT;
}

// fr-FR grouping ("5 490,00"): fr-MA uses a dot ("5.490,00"), which reads
// like a decimal next to prices. "DH" is how the business writes dirhams.
const priceFormatter = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wholeFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 549000 → "5 490,00 DH" */
export function formatMinorUnits(minorUnits: number): string {
  return `${priceFormatter.format(toMajorUnits(minorUnits))} DH`;
}

/** Whole-dirham amounts for marketing copy: 6000 → "6 000 DH" */
export function formatDh(amount: number): string {
  return `${wholeFormatter.format(amount)} DH`;
}

export function sumMinorUnits(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
