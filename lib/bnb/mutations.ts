import type {
  AppSettings,
  BnbData,
  BnbDataV5,
  BookingItem,
  ExpenseItem,
  MonthEntry,
  MonthProperty,
  Property,
} from "@/lib/bnb/types";
import { isValidMonthKey, newId, nowIso, regionDefaults } from "@/lib/bnb/utils";
import { defaultSettings } from "@/lib/bnb/storage";
import { sanitizeExternalUrl } from "@/lib/bnb/url";

function asV5(data: BnbData): BnbDataV5 {
  if (data.version === 5) return data;
  // Fallback: coerce older shapes into v5.
  const baseSettings =
    data.version === 4
      ? data.settings
      : data.version === 3
        ? data.settings
        : data.version === 2
          ? data.settings
          : defaultSettings();
  const properties: Property[] =
    "properties" in baseSettings && Array.isArray((baseSettings as { properties?: unknown }).properties)
      ? ((baseSettings as { properties: Property[] }).properties as Property[])
      : [{ id: "prop_default", name: "Property 1", tenure: "owned" }];
  const defaultPropId = properties[0]?.id ?? "prop_default";
  const region =
    "region" in baseSettings && typeof (baseSettings as { region?: unknown }).region === "string"
      ? ((baseSettings as { region?: "india" | "us" | "europe" | "uk" }).region ?? "india")
      : "india";
  const defaults = regionDefaults(region);
  const months = data.months.map((m) => ({
    ...m,
    incomeCents: 0,
    properties:
      m.properties && m.properties.length > 0
        ? m.properties
        : ([{ propertyId: defaultPropId, rentCents: m.incomeCents }] as MonthProperty[]),
    expenses: m.expenses.map((e) => ({ ...e, propertyId: e.propertyId ?? defaultPropId })),
    bookings: m.bookings ?? [],
  }));
  return {
    version: 5,
    settings: { ...baseSettings, properties, region, currency: defaults.currency, locale: defaults.locale },
    months,
  };
}

function asV7(data: BnbData): BnbDataV5 {
  // Mutations currently operate on v5+ compatible shapes; storage handles v7 persistence.
  // We keep using v5 runtime typing while still allowing extra property fields to exist.
  return asV5(data);
}

function sortMonthsAsc(months: MonthEntry[]): MonthEntry[] {
  return [...months].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}

export function addMonth(data: BnbData, monthKey: string): BnbData {
  const d = asV5(data);
  if (!isValidMonthKey(monthKey)) return data;
  const exists = d.months.some((m) => m.month === monthKey);
  if (exists) return d;
  const t = nowIso();
  const props: MonthProperty[] = d.settings.properties.map((p) => ({ propertyId: p.id, rentCents: 0 }));
  const entry: MonthEntry = {
    id: newId(),
    month: monthKey,
    incomeCents: 0,
    properties: props,
    expenses: [],
    bookings: [],
    notes: "",
    createdAt: t,
    updatedAt: t,
  };
  return { ...d, months: sortMonthsAsc([...d.months, entry]) };
}

export function deleteMonth(data: BnbData, monthId: string): BnbData {
  const d = asV5(data);
  return { ...d, months: d.months.filter((m) => m.id !== monthId) };
}

export function setIncome(data: BnbData, monthId: string, incomeCents: number): BnbData {
  const d = asV5(data);
  if (!Number.isFinite(incomeCents)) return data;
  const t = nowIso();
  return {
    ...d,
    months: d.months.map((m) => (m.id === monthId ? { ...m, incomeCents, updatedAt: t } : m)),
  };
}

export function setNotes(data: BnbData, monthId: string, notes: string): BnbData {
  const d = asV5(data);
  const t = nowIso();
  return {
    ...d,
    months: d.months.map((m) => (m.id === monthId ? { ...m, notes, updatedAt: t } : m)),
  };
}

export function setSettings(data: BnbData, patch: Partial<AppSettings>): BnbData {
  const d = asV5(data);
  const next = { ...d.settings, ...patch };
  if (!next.currency || !next.locale) return d;
  return { ...d, settings: next };
}

export function setRegion(data: BnbData, region: "india" | "us" | "europe" | "uk"): BnbData {
  const d = asV5(data);
  const defaults = regionDefaults(region);
  return {
    ...d,
    settings: { ...d.settings, region, currency: defaults.currency, locale: defaults.locale },
  };
}

export function addProperty(data: BnbData, name: string): BnbData {
  const d = asV5(data);
  const trimmed = name.trim();
  if (!trimmed) return d;
  const id = newId();
  const prop: Property = { id, name: trimmed, tenure: "owned" };
  const t = nowIso();
  return {
    ...d,
    settings: { ...d.settings, properties: [...d.settings.properties, prop] },
    months: d.months.map((m) => ({
      ...m,
      properties: [...(m.properties ?? []), { propertyId: id, rentCents: 0 }],
      updatedAt: t,
    })),
  };
}

export function setPropertyTenure(
  data: BnbData,
  propertyId: string,
  tenure: "owned" | "rented",
): BnbData {
  const d = asV5(data);
  return {
    ...d,
    settings: {
      ...d.settings,
      properties: d.settings.properties.map((p) =>
        p.id === propertyId ? { ...p, tenure } : p,
      ),
    },
  };
}

export function setPropertyListing(
  data: BnbData,
  propertyId: string,
  provider: "airbnb" | "booking" | "other",
  patch: Partial<{ url: string; active: boolean }>,
): BnbData {
  const d = asV7(data);
  const nextProps = d.settings.properties.map((p) => {
    if (p.id !== propertyId) return p;
    const current = p.listings?.[provider] ?? { url: "", active: false };
    const nextUrlRaw = patch.url !== undefined ? patch.url : current.url;
    const sanitized = patch.url !== undefined ? sanitizeExternalUrl(nextUrlRaw) : nextUrlRaw;
    // If url is being set and it's invalid, ignore the update.
    if (patch.url !== undefined && sanitized === null) return p;
    const next = {
      url: patch.url !== undefined ? (sanitized ?? "") : current.url,
      active: patch.active !== undefined ? patch.active : current.active,
    };
    return { ...p, listings: { ...(p.listings ?? {}), [provider]: next } };
  });
  return { ...d, settings: { ...d.settings, properties: nextProps } };
}

export function setPropertyMeta(
  data: BnbData,
  propertyId: string,
  patch: Partial<{ rentDueDay: number | null; agreementValidUntil: string | null }>,
): BnbData {
  const d = asV7(data);
  const nextProps = d.settings.properties.map((p) => {
    if (p.id !== propertyId) return p;
    const rentDueDay =
      patch.rentDueDay === undefined
        ? p.rentDueDay
        : patch.rentDueDay === null
          ? undefined
          : patch.rentDueDay;
    if (rentDueDay !== undefined && (!Number.isInteger(rentDueDay) || rentDueDay < 1 || rentDueDay > 31))
      return p;

    const agreementValidUntil =
      patch.agreementValidUntil === undefined
        ? p.agreementValidUntil
        : patch.agreementValidUntil === null
          ? undefined
          : patch.agreementValidUntil;
    if (agreementValidUntil !== undefined && typeof agreementValidUntil !== "string") return p;

    return { ...p, rentDueDay, agreementValidUntil };
  });
  return { ...d, settings: { ...d.settings, properties: nextProps } };
}

export function setPropertyName(data: BnbData, propertyId: string, name: string): BnbData {
  const d = asV7(data);
  const trimmed = name.trim();
  if (!trimmed) return d;
  return {
    ...d,
    settings: {
      ...d.settings,
      properties: d.settings.properties.map((p) =>
        p.id === propertyId ? { ...p, name: trimmed } : p,
      ),
    },
  };
}

export function setPropertyRent(
  data: BnbData,
  monthId: string,
  propertyId: string,
  rentCents: number,
): BnbData {
  const d = asV5(data);
  if (!Number.isFinite(rentCents)) return d;
  const t = nowIso();
  return {
    ...d,
    months: d.months.map((m) => {
      if (m.id !== monthId) return m;
      const existing = m.properties ?? [];
      const has = existing.some((p) => p.propertyId === propertyId);
      const next = has
        ? existing.map((p) => (p.propertyId === propertyId ? { ...p, rentCents } : p))
        : [...existing, { propertyId, rentCents }];
      return { ...m, properties: next, updatedAt: t };
    }),
  };
}

export function addExpense(
  data: BnbData,
  monthId: string,
  input: Pick<ExpenseItem, "description" | "amountCents"> & {
    day?: number;
    propertyId?: string;
    mode?: "flat" | "per_day";
    rateCentsPerDay?: number;
    days?: number;
  },
): BnbData {
  const d = asV5(data);
  const desc = input.description.trim();
  if (!desc) return data;
  if (!Number.isFinite(input.amountCents)) return data;
  if (input.day !== undefined && (!Number.isInteger(input.day) || input.day < 1 || input.day > 31))
    return data;

  const t = nowIso();
  const mode = input.mode ?? "flat";
  const computedAmount =
    mode === "per_day"
      ? (() => {
          if (!Number.isFinite(input.rateCentsPerDay)) return null;
          if (!Number.isInteger(input.days) || (input.days ?? 0) < 1) return null;
          return (input.rateCentsPerDay as number) * (input.days as number);
        })()
      : input.amountCents;
  if (computedAmount === null) return data;

  const expense: ExpenseItem = {
    id: newId(),
    description: desc,
    amountCents: computedAmount,
    mode,
    rateCentsPerDay: mode === "per_day" ? input.rateCentsPerDay : undefined,
    days: mode === "per_day" ? input.days : undefined,
    propertyId: input.propertyId,
    day: input.day,
    createdAt: t,
    updatedAt: t,
  };

  return {
    ...d,
    months: d.months.map((m) =>
      m.id === monthId ? { ...m, expenses: [...m.expenses, expense], updatedAt: t } : m,
    ),
  };
}

export function updateExpense(
  data: BnbData,
  monthId: string,
  expenseId: string,
  patch: Partial<
    Pick<
      ExpenseItem,
      "description" | "amountCents" | "day" | "propertyId" | "mode" | "rateCentsPerDay" | "days"
    >
  >,
): BnbData {
  const d = asV5(data);
  const t = nowIso();
  return {
    ...d,
    months: d.months.map((m) => {
      if (m.id !== monthId) return m;
      const next = m.expenses.map((e) => {
        if (e.id !== expenseId) return e;
        const nextDesc = patch.description !== undefined ? patch.description.trim() : e.description;
        const nextMode = patch.mode !== undefined ? patch.mode : e.mode ?? "flat";
        const nextRate =
          patch.rateCentsPerDay !== undefined ? patch.rateCentsPerDay : e.rateCentsPerDay;
        const nextDays = patch.days !== undefined ? patch.days : e.days;
        const nextAmount =
          nextMode === "per_day"
            ? (() => {
                if (!Number.isFinite(nextRate)) return null;
                if (!Number.isInteger(nextDays) || (nextDays ?? 0) < 1) return null;
                return (nextRate as number) * (nextDays as number);
              })()
            : patch.amountCents !== undefined
              ? patch.amountCents
              : e.amountCents;
        const nextDay = patch.day !== undefined ? patch.day : e.day;
        const nextProp = patch.propertyId !== undefined ? patch.propertyId : e.propertyId;
        if (!nextDesc) return e;
        if (nextAmount === null || !Number.isFinite(nextAmount)) return e;
        if (nextDay !== undefined && (!Number.isInteger(nextDay) || nextDay < 1 || nextDay > 31))
          return e;
        return {
          ...e,
          description: nextDesc,
          amountCents: nextAmount,
          propertyId: nextProp,
          mode: nextMode,
          rateCentsPerDay: nextMode === "per_day" ? nextRate : undefined,
          days: nextMode === "per_day" ? nextDays : undefined,
          day: nextDay,
          updatedAt: t,
        };
      });
      return { ...m, expenses: next, updatedAt: t };
    }),
  };
}

export function deleteExpense(data: BnbData, monthId: string, expenseId: string): BnbData {
  const d = asV5(data);
  const t = nowIso();
  return {
    ...d,
    months: d.months.map((m) =>
      m.id === monthId
        ? { ...m, expenses: m.expenses.filter((e) => e.id !== expenseId), updatedAt: t }
        : m,
    ),
  };
}

export function addBooking(
  data: BnbData,
  monthId: string,
  input: Pick<BookingItem, "propertyId" | "nights" | "pricePerNightCents"> & { day?: number },
): BnbData {
  const d = asV5(data);
  if (!input.propertyId) return d;
  if (!Number.isInteger(input.nights) || input.nights < 1) return d;
  if (!Number.isFinite(input.pricePerNightCents)) return d;
  if (input.day !== undefined && (!Number.isInteger(input.day) || input.day < 1 || input.day > 31))
    return d;
  const t = nowIso();
  const b: BookingItem = {
    id: newId(),
    propertyId: input.propertyId,
    day: input.day,
    nights: input.nights,
    pricePerNightCents: input.pricePerNightCents,
    createdAt: t,
    updatedAt: t,
  };
  return {
    ...d,
    months: d.months.map((m) =>
      m.id === monthId ? { ...m, bookings: [...(m.bookings ?? []), b], updatedAt: t } : m,
    ),
  };
}

export function deleteBooking(data: BnbData, monthId: string, bookingId: string): BnbData {
  const d = asV5(data);
  const t = nowIso();
  return {
    ...d,
    months: d.months.map((m) =>
      m.id === monthId
        ? { ...m, bookings: (m.bookings ?? []).filter((b) => b.id !== bookingId), updatedAt: t }
        : m,
    ),
  };
}

