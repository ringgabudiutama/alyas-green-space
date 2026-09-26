// Utilitas tanggal yang aman dipakai di server maupun client.
// Semua tanggal "harian" disimpan sebagai string YYYY-MM-DD sesuai zona waktu aplikasi.

export const APP_TZ: string =
  process.env.NEXT_PUBLIC_APP_TIMEZONE || process.env.APP_TIMEZONE || "Asia/Jakarta";

const ymdFmt = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Tanggal (YYYY-MM-DD) dari sebuah Date, dalam zona waktu aplikasi */
export function toYmd(d: Date = new Date()): string {
  return ymdFmt().format(d);
}

export function todayStr(): string {
  return toYmd(new Date());
}

export function currentMonth(): string {
  return todayStr().slice(0, 7);
}

/** Jam sekarang (0-23) di zona waktu aplikasi */
export function hourNow(): number {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ, hour: "2-digit", hour12: false }).format(new Date());
  return Number(h) % 24;
}

export type DayPeriod = "morning" | "afternoon" | "evening";
export function dayPeriod(hour = hourNow()): DayPeriod {
  if (hour >= 4 && hour < 11) return "morning";
  if (hour >= 11 && hour < 18) return "afternoon";
  return "evening";
}

function parse(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmtUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(ymd: string, n: number): string {
  const d = parse(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return fmtUTC(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** [awal, akhir] inklusif untuk bulan "YYYY-MM" */
export function monthRange(month: string): [string, string] {
  return [`${month}-01`, `${month}-${String(daysInMonth(month)).padStart(2, "0")}`];
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Senin minggu ini */
export function startOfWeek(ymd: string): string {
  const d = parse(ymd);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Senin
  return addDays(ymd, -dow);
}

export function isValidYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parse(s).getTime());
}
export function isValidMonth(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** "30 November 2026" */
export function formatDate(ymd: string | null | undefined): string {
  if (!ymd) return "-";
  const d = parse(ymd.slice(0, 10));
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** "Sab, 26 Sep" */
export function formatShort(ymd: string): string {
  const d = parse(ymd);
  return `${DAYS_ID[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()].slice(0, 3)}`;
}
export function formatDayName(ymd: string): string {
  return DAYS_ID[parse(ymd).getUTCDay()];
}
/** "September 2026" */
export function formatMonth(month: string, lang: "id" | "en" = "en"): string {
  const [y, m] = month.split("-").map(Number);
  return `${(lang === "id" ? MONTHS_ID : MONTHS_EN)[m - 1]} ${y}`;
}
export function monthShort(month: string): string {
  const m = Number(month.slice(5, 7));
  return MONTHS_ID[m - 1].slice(0, 3);
}
