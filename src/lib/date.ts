// Calendar dates are civil (date-only) and must be accurate for US students, so
// everything here resolves in America/New_York (ET) rather than the server's UTC.
// Using toISOString() for a date would roll over at UTC midnight — e.g. 8pm ET on
// Oct 12 is already Oct 13 in UTC — which would mis-date tasks and the "today"
// highlight. These helpers avoid that: an instant is converted to its ET calendar
// date, and date math is done on the Y/M/D components (anchored at noon UTC so a
// daylight-saving change can never shift the date).

const TZ = "America/New_York";

/** The ET calendar date of an instant, as "YYYY-MM-DD". */
export function toISODate(instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Today's ET date as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Build an ISO date from components (month is 1-based). */
export function isoFromYMD(y: number, m: number, d: number): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${y}-${p(m)}-${p(d)}`;
}

/** Add whole days to an ISO date, DST-safe (noon-UTC anchor). */
export function isoAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d, 12) + days * 86_400_000;
  const dt = new Date(t);
  return isoFromYMD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Whole days from `a` to `b` (b - a). */
export function isoDaysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

/** The ET year + 0-based month of an instant (for grade/deadline logic). */
export function etYearMonth(now: Date = new Date()): {
  year: number;
  month: number;
} {
  const iso = toISODate(now);
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m - 1 };
}
