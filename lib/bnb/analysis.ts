import type { BnbData, MonthEntry, Property } from "@/lib/bnb/types";

export type Period = "monthly" | "quarterly" | "semiannual" | "annual";

export type SummaryRow = {
  period: string;
  revenueCents: number;
  operatingCostCents: number;
  baseRentCostCents: number;
  totalCostCents: number;
  profitCents: number;
  nights: number;
};

function periodKey(monthKey: string, period: Period): string {
  const [y, m] = monthKey.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return monthKey;
  if (period === "monthly") return monthKey;
  if (period === "annual") return String(y);
  if (period === "quarterly") {
    const q = Math.floor((m - 1) / 3) + 1;
    return `${y}-Q${q}`;
  }
  // semiannual
  const h = m <= 6 ? 1 : 2;
  return `${y}-H${h}`;
}

function propertyBaseRentCost(month: MonthEntry, property: Property): number {
  if (property.tenure !== "rented") return 0;
  return month.properties?.find((p) => p.propertyId === property.id)?.rentCents ?? 0;
}

function propertyOperatingCost(month: MonthEntry, propertyId: string): number {
  return month.expenses
    .filter((e) => e.propertyId === propertyId)
    .reduce((s, e) => s + e.amountCents, 0);
}

function propertyRevenue(month: MonthEntry, propertyId: string): { revenue: number; nights: number } {
  const bs = month.bookings ?? [];
  const filtered = bs.filter((b) => b.propertyId === propertyId);
  const nights = filtered.reduce((s, b) => s + b.nights, 0);
  const revenue = filtered.reduce((s, b) => s + b.nights * b.pricePerNightCents, 0);
  return { revenue, nights };
}

export function buildSummaryRows(opts: {
  data: BnbData;
  properties: Property[];
  period: Period;
  propertyId?: string; // undefined => all properties
}): SummaryRow[] {
  const { data, properties, period, propertyId } = opts;
  const months = [...data.months].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));

  const bucket = new Map<string, SummaryRow>();
  for (const m of months) {
    const key = periodKey(m.month, period);
    if (!bucket.has(key)) {
      bucket.set(key, {
        period: key,
        revenueCents: 0,
        operatingCostCents: 0,
        baseRentCostCents: 0,
        totalCostCents: 0,
        profitCents: 0,
        nights: 0,
      });
    }
    const row = bucket.get(key)!;

    const targetProps = propertyId ? properties.filter((p) => p.id === propertyId) : properties;
    for (const p of targetProps) {
      const base = propertyBaseRentCost(m, p);
      const op = propertyOperatingCost(m, p.id);
      const rev = propertyRevenue(m, p.id);
      row.baseRentCostCents += base;
      row.operatingCostCents += op;
      row.revenueCents += rev.revenue;
      row.nights += rev.nights;
    }
  }

  const rows = [...bucket.values()].map((r) => {
    const total = r.baseRentCostCents + r.operatingCostCents;
    return { ...r, totalCostCents: total, profitCents: r.revenueCents - total };
  });
  rows.sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
  return rows;
}

