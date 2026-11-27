/**
 * P04 date helpers. Every time is Gulf Standard Time (UTC+4) and every date shows as "12 Nov 2026".
 * Pure functions: pass `now` in so tests can fix the clock.
 */

export const DAY = 86_400_000;
export const MIN = 60_000;
const TZ = 4 * 3_600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const ms = (iso: string) => Date.parse(iso);
const gst = (t: number) => new Date(t + TZ);
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Midnight in the Gulf on the day of `t`, as epoch milliseconds. */
export function startOfDay(t: number | string): number {
  const v = typeof t === "string" ? ms(t) : t;
  const g = gst(v);
  return Date.UTC(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate()) - TZ;
}

/** `dayOff` days from the day of `now`, at hh:mm Gulf time, as an ISO string. */
export function at(now: number, dayOff: number, h: number, m = 0): string {
  return new Date(startOfDay(now) + dayOff * DAY + h * 3_600_000 + m * MIN).toISOString();
}

export const addDays = (iso: string, n: number) => new Date(ms(iso) + n * DAY).toISOString();
export const addMins = (iso: string, n: number) => new Date(ms(iso) + n * MIN).toISOString();
export const overlaps = (a1: string, a2: string, b1: string, b2: string) =>
  ms(a1) < ms(b2) && ms(b1) < ms(a2);
/** Whole days from the day of `a` to the day of `b`. */
export const daysBetween = (a: number | string, b: number | string) =>
  Math.round((startOfDay(b) - startOfDay(a)) / DAY);

export function fmtDate(iso: string | number): string {
  const g = gst(typeof iso === "string" ? ms(iso) : iso);
  return `${g.getUTCDate()} ${MONTHS[g.getUTCMonth()]} ${g.getUTCFullYear()}`;
}
export function fmtTime(iso: string): string {
  const g = gst(ms(iso));
  return `${pad2(g.getUTCHours())}:${pad2(g.getUTCMinutes())}`;
}
export const fmtDateTime = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`;
export function weekday(iso: string): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][gst(ms(iso)).getUTCDay()] ?? "";
}

/** "2026-11-30" for a date input, in Gulf time. */
export function dateInput(t: number | string): string {
  const g = gst(typeof t === "string" ? ms(t) : t);
  return `${g.getUTCFullYear()}-${pad2(g.getUTCMonth() + 1)}-${pad2(g.getUTCDate())}`;
}

/** A date ("2026-11-30") and time ("10:00") typed in Gulf time, as an ISO string, or null. */
export function parseGst(date: string, time: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const v = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2])) - TZ;
  return Number.isNaN(v) ? null : new Date(v).toISOString();
}

/** "16 weeks" → 112 days; "3 months" → 84 days (4 weeks a month). Unknown text → 12 weeks. */
export function durationDays(text: string): number {
  const n = Number.parseInt(text, 10);
  if (!Number.isFinite(n) || n <= 0) return 84;
  return /month/i.test(text) ? n * 28 : /day/i.test(text) ? n : n * 7;
}

export const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;
