import type {
  AppSettings,
  BnbData,
  BnbDataV1,
  BnbDataV2,
  BnbDataV3,
  BnbDataV4,
  BnbDataV5,
  BnbDataV6,
  BnbDataV7,
  BookingItem,
  ExpenseItem,
  ListingLink,
  ListingProvider,
  MonthEntry,
  MonthProperty,
  Property,
} from "@/lib/bnb/types";
import { DEFAULT_REGION, isValidMonthKey, newId, nowIso, regionDefaults } from "@/lib/bnb/utils";

const STORAGE_KEY = "bnbmanager:data:v1";

export function defaultSettings(): AppSettings {
  const d = regionDefaults(DEFAULT_REGION);
  return { region: DEFAULT_REGION, currency: d.currency, locale: d.locale };
}

function defaultProperties(): Property[] {
  return [{ id: "prop_default", name: "Property 1", tenure: "owned" }];
}

export function emptyData(): BnbDataV5 {
  return { version: 5, settings: { ...defaultSettings(), properties: defaultProperties() }, months: [] };
}

function isExpenseItem(x: unknown): x is ExpenseItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const day = o.day;
  const propertyId = o.propertyId;
  const mode = o.mode;
  const rate = o.rateCentsPerDay;
  const days = o.days;
  return (
    typeof o.id === "string" &&
    typeof o.description === "string" &&
    typeof o.amountCents === "number" &&
    Number.isFinite(o.amountCents) &&
    (propertyId === undefined || typeof propertyId === "string") &&
    (mode === undefined || mode === "flat" || mode === "per_day") &&
    (rate === undefined || (typeof rate === "number" && Number.isFinite(rate))) &&
    (days === undefined || (typeof days === "number" && Number.isInteger(days) && days >= 1)) &&
    (day === undefined ||
      (typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 31)) &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string"
  );
}

function isMonthProperty(x: unknown): x is MonthProperty {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.propertyId === "string" &&
    typeof o.rentCents === "number" &&
    Number.isFinite(o.rentCents)
  );
}

function isMonthEntry(x: unknown): x is MonthEntry {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const notes = o.notes;
  const props = o.properties;
  const bookings = o.bookings;
  if (
    typeof o.id !== "string" ||
    typeof o.month !== "string" ||
    !isValidMonthKey(o.month) ||
    typeof o.incomeCents !== "number" ||
    !Number.isFinite(o.incomeCents) ||
    !Array.isArray(o.expenses) ||
    typeof o.createdAt !== "string" ||
    typeof o.updatedAt !== "string"
  ) {
    return false;
  }
  if (notes !== undefined && typeof notes !== "string") return false;
  if (props !== undefined) {
    if (!Array.isArray(props)) return false;
    if (!props.every(isMonthProperty)) return false;
  }
  if (bookings !== undefined) {
    if (!Array.isArray(bookings)) return false;
    if (!bookings.every(isBookingItem)) return false;
  }
  return o.expenses.every(isExpenseItem);
}

function isDataV1(x: unknown): x is BnbDataV1 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 1) return false;
  if (!Array.isArray(o.months)) return false;
  return o.months.every(isMonthEntry);
}

function isSettings(x: unknown): x is AppSettings {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const region = o.region;
  return (
    typeof o.currency === "string" &&
    typeof o.locale === "string" &&
    (region === undefined || region === "india" || region === "us" || region === "europe" || region === "uk")
  );
}

function isDataV2(x: unknown): x is BnbDataV2 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 2) return false;
  if (!isSettings(o.settings)) return false;
  if (!Array.isArray(o.months)) return false;
  return o.months.every(isMonthEntry);
}

function isListingProvider(x: unknown): x is ListingProvider {
  return x === "airbnb" || x === "booking" || x === "other";
}

function isListingLink(x: unknown): x is ListingLink {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.url === "string" && typeof o.active === "boolean";
}

function isListings(x: unknown): x is Property["listings"] {
  if (x === undefined) return true;
  if (!x || typeof x !== "object") return false;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (!isListingProvider(k)) return false;
    if (v !== undefined && !isListingLink(v)) return false;
  }
  return true;
}

function isProperty(x: unknown): x is Property {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const tenure = o.tenure;
  const listings = o.listings;
  const rentDueDay = o.rentDueDay;
  const agreementValidUntil = o.agreementValidUntil;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    (tenure === undefined || tenure === "owned" || tenure === "rented") &&
    isListings(listings) &&
    (rentDueDay === undefined ||
      (typeof rentDueDay === "number" &&
        Number.isInteger(rentDueDay) &&
        rentDueDay >= 1 &&
        rentDueDay <= 31)) &&
    (agreementValidUntil === undefined || typeof agreementValidUntil === "string")
  );
}

function isDataV7(x: unknown): x is BnbDataV7 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 7) return false;
  if (!o.settings || typeof o.settings !== "object") return false;
  const s = o.settings as Record<string, unknown>;
  if (typeof s.currency !== "string" || typeof s.locale !== "string") return false;
  const region = s.region;
  if (
    region !== undefined &&
    region !== "india" &&
    region !== "us" &&
    region !== "europe" &&
    region !== "uk"
  )
    return false;
  if (!Array.isArray(s.properties) || !s.properties.every(isProperty)) return false;
  if (!Array.isArray(o.months)) return false;
  return (o.months as unknown[]).every(isMonthEntry);
}

function isDataV3(x: unknown): x is BnbDataV3 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 3) return false;
  if (!o.settings || typeof o.settings !== "object") return false;
  const s = o.settings as Record<string, unknown>;
  if (typeof s.currency !== "string" || typeof s.locale !== "string") return false;
  if (!Array.isArray(s.properties) || !s.properties.every(isProperty)) return false;
  if (!Array.isArray(o.months)) return false;
  return (o.months as unknown[]).every(isMonthEntry);
}

function isDataV4(x: unknown): x is BnbDataV4 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 4) return false;
  if (!o.settings || typeof o.settings !== "object") return false;
  const s = o.settings as Record<string, unknown>;
  if (typeof s.currency !== "string" || typeof s.locale !== "string") return false;
  if (!Array.isArray(s.properties) || !s.properties.every(isProperty)) return false;
  if (!Array.isArray(o.months)) return false;
  return (o.months as unknown[]).every(isMonthEntry);
}

function isDataV5(x: unknown): x is BnbDataV5 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 5) return false;
  if (!o.settings || typeof o.settings !== "object") return false;
  const s = o.settings as Record<string, unknown>;
  if (typeof s.currency !== "string" || typeof s.locale !== "string") return false;
  // region is optional but constrained
  const region = s.region;
  if (
    region !== undefined &&
    region !== "india" &&
    region !== "us" &&
    region !== "europe" &&
    region !== "uk"
  )
    return false;
  if (!Array.isArray(s.properties) || !s.properties.every(isProperty)) return false;
  if (!Array.isArray(o.months)) return false;
  return (o.months as unknown[]).every(isMonthEntry);
}

function isDataV6(x: unknown): x is BnbDataV6 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 6) return false;
  if (!o.settings || typeof o.settings !== "object") return false;
  const s = o.settings as Record<string, unknown>;
  if (typeof s.currency !== "string" || typeof s.locale !== "string") return false;
  const region = s.region;
  if (
    region !== undefined &&
    region !== "india" &&
    region !== "us" &&
    region !== "europe" &&
    region !== "uk"
  )
    return false;
  if (!Array.isArray(s.properties) || !s.properties.every(isProperty)) return false;
  if (!Array.isArray(o.months)) return false;
  return (o.months as unknown[]).every(isMonthEntry);
}

function migrateToV4(v3: BnbDataV3): BnbDataV4 {
  return {
    version: 4,
    settings: {
      ...v3.settings,
      properties: v3.settings.properties.map((p) => ({ ...p, tenure: p.tenure ?? "owned" })),
    },
    months: v3.months,
  };
}

function migrateToV3(v: BnbDataV1 | BnbDataV2): BnbDataV3 {
  const baseSettings = v.version === 2 ? v.settings : defaultSettings();
  const props = defaultProperties();
  const defaultPropId = props[0].id;
  const migratedMonths = v.months.map((m) => ({
    ...m,
    // Attach existing transactions to default property so op-cost is per property.
    expenses: m.expenses.map((e) => ({ ...e, propertyId: e.propertyId ?? defaultPropId })),
    // Convert legacy month-level income to per-property rent.
    properties:
      m.properties && m.properties.length > 0
        ? m.properties
        : [{ propertyId: defaultPropId, rentCents: m.incomeCents }],
    incomeCents: 0,
  }));
  return { version: 3, settings: { ...baseSettings, properties: props }, months: migratedMonths };
}

export function loadData(): BnbData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as unknown;
    if (isDataV7(parsed)) return parsed;
    if (isDataV6(parsed)) return migrateToV7(parsed);
    if (isDataV5(parsed)) return migrateToV6(parsed);
    if (isDataV4(parsed)) return migrateToV5(parsed);
    if (isDataV3(parsed)) return migrateToV4(parsed);
    if (isDataV2(parsed)) return migrateToV3(parsed);
    if (isDataV1(parsed)) return migrateToV3(parsed);
    return emptyData();
  } catch {
    return emptyData();
  }
}

export function saveData(data: BnbData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function seedExampleIfEmpty(data: BnbData): BnbData {
  const v7: BnbDataV7 =
    data.version === 7
      ? data
      : data.version === 6
        ? migrateToV7(data)
        : data.version === 5
          ? migrateToV7(migrateToV6(data))
          : data.version === 4
            ? migrateToV7(migrateToV6(migrateToV5(data)))
            : data.version === 3
              ? migrateToV7(migrateToV6(migrateToV5(migrateToV4(data))))
              : migrateToV7(migrateToV6(migrateToV5(migrateToV4(migrateToV3(data)))));
  if (v7.months.length > 0) return v7;
  const monthKey = new Date().toISOString().slice(0, 7);
  const t = nowIso();
  const propId = v7.settings.properties[0]?.id ?? "prop_default";
  const example: MonthEntry = {
    id: newId(),
    month: isValidMonthKey(monthKey) ? monthKey : "2026-01",
    incomeCents: 0,
    properties: [{ propertyId: propId, rentCents: 3200000 }],
    expenses: [
      {
        id: newId(),
        description: "Cleaning",
        amountCents: 95000,
        propertyId: propId,
        day: 3,
        createdAt: t,
        updatedAt: t,
      },
      {
        id: newId(),
        description: "Supplies",
        amountCents: 42000,
        propertyId: propId,
        day: 6,
        createdAt: t,
        updatedAt: t,
      },
    ],
    bookings: [
      {
        id: newId(),
        propertyId: propId,
        day: 10,
        nights: 3,
        pricePerNightCents: 16000 * 100,
        createdAt: t,
        updatedAt: t,
      },
    ],
    notes: "Example data — edit or delete.",
    createdAt: t,
    updatedAt: t,
  };
  return { ...v7, months: [example] };
}

function migrateToV7(v6: BnbDataV6): BnbDataV7 {
  return {
    version: 7,
    settings: {
      ...v6.settings,
      properties: v6.settings.properties.map((p) => ({
        ...p,
        rentDueDay: p.rentDueDay,
        agreementValidUntil: p.agreementValidUntil,
      })),
    },
    months: v6.months,
  };
}

function migrateToV6(v5: BnbDataV5): BnbDataV6 {
  return {
    version: 6,
    settings: {
      ...v5.settings,
      properties: v5.settings.properties.map((p) => ({ ...p, listings: p.listings ?? {} })),
    },
    months: v5.months,
  };
}

function isBookingItem(x: unknown): x is BookingItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const day = o.day;
  return (
    typeof o.id === "string" &&
    typeof o.propertyId === "string" &&
    typeof o.nights === "number" &&
    Number.isFinite(o.nights) &&
    Number.isInteger(o.nights) &&
    o.nights >= 1 &&
    typeof o.pricePerNightCents === "number" &&
    Number.isFinite(o.pricePerNightCents) &&
    (day === undefined || (typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 31)) &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string"
  );
}

function migrateToV5(v4: BnbDataV4): BnbDataV5 {
  const region =
    v4.settings.currency === "INR"
      ? "india"
      : v4.settings.currency === "USD"
        ? "us"
        : v4.settings.currency === "EUR"
          ? "europe"
          : v4.settings.currency === "GBP"
            ? "uk"
            : DEFAULT_REGION;
  const defaults = regionDefaults(region);
  return {
    version: 5,
    settings: {
      ...v4.settings,
      region,
      currency: defaults.currency,
      locale: defaults.locale,
    },
    months: v4.months.map((m) => ({ ...m, bookings: m.bookings ?? [] })),
  };
}

