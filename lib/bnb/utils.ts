import type { MonthEntry } from "@/lib/bnb/types";
import type { BookingItem, Region } from "@/lib/bnb/types";

export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_LOCALE = "en-IN";
export const DEFAULT_REGION: Region = "india";

export function regionDefaults(region: Region): { currency: string; locale: string } {
  switch (region) {
    case "india":
      return { currency: "INR", locale: "en-IN" };
    case "us":
      return { currency: "USD", locale: "en-US" };
    case "europe":
      return { currency: "EUR", locale: "en-IE" };
    case "uk":
      return { currency: "GBP", locale: "en-GB" };
    default:
      return { currency: DEFAULT_CURRENCY, locale: DEFAULT_LOCALE };
  }
}

export function isValidMonthKey(value: string): boolean {
  // YYYY-MM where MM is 01-12
  return /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function formatMonthLabel(monthKey: string): string {
  if (!isValidMonthKey(monthKey)) return monthKey;
  const [y, m] = monthKey.split("-").map((p) => Number(p));
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

export function getCurrencyFractionDigits(locale: string, currency: string): number {
  // For most currencies this is 2 (INR, USD, EUR). Some currencies are 0 (JPY) or 3 (BHD).
  return (
    new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

export function minorToMajor(minor: number, fractionDigits: number): number {
  return minor / Math.pow(10, fractionDigits);
}

export function majorToMinor(major: number, fractionDigits: number): number {
  return Math.round(major * Math.pow(10, fractionDigits));
}

export function formatMoney(
  minorUnits: number,
  opts?: { locale?: string; currency?: string },
): string {
  const locale = opts?.locale ?? DEFAULT_LOCALE;
  const currency = opts?.currency ?? DEFAULT_CURRENCY;
  const fd = getCurrencyFractionDigits(locale, currency);
  const amount = minorToMajor(minorUnits, fd);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function minorToInputString(minorUnits: number, fractionDigits: number): string {
  const amount = minorToMajor(minorUnits, fractionDigits);
  return amount.toFixed(fractionDigits);
}

export function parseMoneyToMinor(raw: string, fractionDigits: number): number | null {
  const s = raw.trim();
  if (s === "") return 0;
  const cleaned = s.replace(/[,\s]/g, "");

  // Only accept numbers with optional leading "-" and optional decimals up to fractionDigits.
  const re =
    fractionDigits > 0
      ? new RegExp(`^-?\\d*(?:\\.\\d{0,${fractionDigits}})?$`)
      : /^-?\d*$/;
  if (!re.test(cleaned)) return null;

  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [wholeRaw, fracRaw = ""] = unsigned.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  if (!/^\d+$/.test(whole)) return null;
  if (fracRaw && !/^\d+$/.test(fracRaw)) return null;
  if (fracRaw.length > fractionDigits) return null;

  const frac = fracRaw.padEnd(fractionDigits, "0");
  const wholeMinor = Number(whole) * Math.pow(10, fractionDigits);
  const fracMinor = frac ? Number(frac) : 0;
  const minor = wholeMinor + fracMinor;
  if (!Number.isFinite(minor)) return null;
  return negative ? -minor : minor;
}

// Backwards-compatible name (still used across the app).
export function parseMoneyToCents(raw: string, fractionDigits = 2): number | null {
  return parseMoneyToMinor(raw, fractionDigits);
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function getDefaultNewMonth(): string {
  // Default to next month so it's easy to create upcoming month entries.
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}`;
}

export function getMonthTotals(month: MonthEntry): {
  incomeCents: number;
  expensesCents: number;
  profitCents: number;
} {
  const baseRentCostCents = month.properties?.reduce((sum, p) => sum + p.rentCents, 0) ?? 0;
  const operatingCostCents = month.expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const totalCostCents = baseRentCostCents + operatingCostCents;
  const revenueCents = (month.bookings ?? []).reduce(
    (sum, b) => sum + b.pricePerNightCents * b.nights,
    0,
  );
  // Keep field names for UI compatibility:
  // - incomeCents => revenue
  // - expensesCents => total costs
  return { incomeCents: revenueCents, expensesCents: totalCostCents, profitCents: revenueCents - totalCostCents };
}

export function getBookingRevenueCents(b: BookingItem): number {
  return b.pricePerNightCents * b.nights;
}

