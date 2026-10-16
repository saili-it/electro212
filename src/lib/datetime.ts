// Shop dates are entered and shown in Moroccan time. Africa/Casablanca is not a
// fixed offset (UTC+1, but UTC+0 during Ramadan), so offsets are computed per date.
export const SHOP_TIME_ZONE = "Africa/Casablanca";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function zonedParts(date: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Milliseconds to add to UTC to get shop wall-clock time, at that instant. */
function offsetAt(date: Date) {
  const p = zonedParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-10-10T23:59" (from <input type="datetime-local">, Moroccan time) → UTC Date. */
export function shopLocalToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes handle the rare case where the offset differs between the guess and the result.
  let result = asUtc - offsetAt(new Date(asUtc));
  result = asUtc - offsetAt(new Date(result));
  return new Date(result);
}

/** UTC Date → "2026-10-10T23:59" in Moroccan time, for a datetime-local input. */
export function dateToShopLocal(date: Date): string {
  const p = zonedParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** → "10/10 à 23h59" (Moroccan time) */
export function formatShopDeadline(date: Date): string {
  const p = zonedParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.day)}/${pad(p.month)} à ${pad(p.hour)}h${pad(p.minute)}`;
}

/** → "10/10/2026 23:59" (Moroccan time) */
export function formatShopDateTime(date: Date): string {
  const p = zonedParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.day)}/${pad(p.month)}/${p.year} ${pad(p.hour)}:${pad(p.minute)}`;
}
