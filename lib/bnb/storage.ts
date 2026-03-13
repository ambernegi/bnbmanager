import type {
  AppSettings,
  BnbData,
  BnbDataV1,
  BnbDataV2,
  BnbDataV3,
  BnbDataV4,
  ExpenseItem,
  MonthEntry,
  MonthProperty,
  Property,
} from "@/lib/bnb/types";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, isValidMonthKey, newId, nowIso } from "@/lib/bnb/utils";

const STORAGE_KEY = "bnbmanager:data:v1";

export function defaultSettings(): AppSettings {
  return { currency: DEFAULT_CURRENCY, locale: DEFAULT_LOCALE };
}

function defaultProperties(): Property[] {
  return [{ id: "prop_default", name: "Property 1", tenure: "owned" }];
}

export function emptyData(): BnbDataV3 {
  return { version: 3, settings: { ...defaultSettings(), properties: defaultProperties() }, months: [] };
}

function isExpenseItem(x: unknown): x is ExpenseItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const day = o.day;
  const propertyId = o.propertyId;
  return (
    typeof o.id === "string" &&
    typeof o.description === "string" &&
    typeof o.amountCents === "number" &&
    Number.isFinite(o.amountCents) &&
    (propertyId === undefined || typeof propertyId === "string") &&
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
  return typeof o.currency === "string" && typeof o.locale === "string";
}

function isDataV2(x: unknown): x is BnbDataV2 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 2) return false;
  if (!isSettings(o.settings)) return false;
  if (!Array.isArray(o.months)) return false;
  return o.months.every(isMonthEntry);
}

function isProperty(x: unknown): x is Property {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const tenure = o.tenure;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    (tenure === undefined || tenure === "owned" || tenure === "rented")
  );
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
    if (isDataV4(parsed)) return parsed;
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
  const v4: BnbDataV4 =
    data.version === 4
      ? data
      : data.version === 3
        ? migrateToV4(data)
        : migrateToV4(migrateToV3(data));
  if (v4.months.length > 0) return v4;
  const monthKey = new Date().toISOString().slice(0, 7);
  const t = nowIso();
  const propId = v4.settings.properties[0]?.id ?? "prop_default";
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
    notes: "Example data — edit or delete.",
    createdAt: t,
    updatedAt: t,
  };
  return { ...v4, months: [example] };
}

