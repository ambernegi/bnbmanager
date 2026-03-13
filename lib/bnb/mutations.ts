import type {
  AppSettings,
  BnbData,
  BnbDataV3,
  ExpenseItem,
  MonthEntry,
  MonthProperty,
  Property,
} from "@/lib/bnb/types";
import { isValidMonthKey, newId, nowIso } from "@/lib/bnb/utils";
import { defaultSettings } from "@/lib/bnb/storage";

function asV3(data: BnbData): BnbDataV3 {
  if (data.version === 3) return data;
  const baseSettings = data.version === 2 ? data.settings : defaultSettings();
  const properties: Property[] = [{ id: "prop_default", name: "Property 1" }];
  const defaultPropId = properties[0].id;
  const months = data.months.map((m) => ({
    ...m,
    incomeCents: 0,
    properties:
      m.properties && m.properties.length > 0
        ? m.properties
        : ([{ propertyId: defaultPropId, rentCents: m.incomeCents }] as MonthProperty[]),
    expenses: m.expenses.map((e) => ({ ...e, propertyId: e.propertyId ?? defaultPropId })),
  }));
  return { version: 3, settings: { ...baseSettings, properties }, months };
}

function sortMonthsAsc(months: MonthEntry[]): MonthEntry[] {
  return [...months].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}

export function addMonth(data: BnbData, monthKey: string): BnbData {
  const d = asV3(data);
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
    notes: "",
    createdAt: t,
    updatedAt: t,
  };
  return { ...d, months: sortMonthsAsc([...d.months, entry]) };
}

export function deleteMonth(data: BnbData, monthId: string): BnbData {
  const d = asV3(data);
  return { ...d, months: d.months.filter((m) => m.id !== monthId) };
}

export function setIncome(data: BnbData, monthId: string, incomeCents: number): BnbData {
  const d = asV3(data);
  if (!Number.isFinite(incomeCents)) return data;
  const t = nowIso();
  return {
    ...d,
    months: d.months.map((m) => (m.id === monthId ? { ...m, incomeCents, updatedAt: t } : m)),
  };
}

export function setNotes(data: BnbData, monthId: string, notes: string): BnbData {
  const d = asV3(data);
  const t = nowIso();
  return {
    ...d,
    months: d.months.map((m) => (m.id === monthId ? { ...m, notes, updatedAt: t } : m)),
  };
}

export function setSettings(data: BnbData, patch: Partial<AppSettings>): BnbData {
  const d = asV3(data);
  const next: AppSettings = { ...d.settings, ...patch };
  if (!next.currency || !next.locale) return d;
  return { ...d, settings: next };
}

export function addProperty(data: BnbData, name: string): BnbData {
  const d = asV3(data);
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
  const d = asV3(data);
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

export function setPropertyRent(
  data: BnbData,
  monthId: string,
  propertyId: string,
  rentCents: number,
): BnbData {
  const d = asV3(data);
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
  input: Pick<ExpenseItem, "description" | "amountCents"> & { day?: number; propertyId?: string },
): BnbData {
  const d = asV3(data);
  const desc = input.description.trim();
  if (!desc) return data;
  if (!Number.isFinite(input.amountCents)) return data;
  if (input.day !== undefined && (!Number.isInteger(input.day) || input.day < 1 || input.day > 31))
    return data;

  const t = nowIso();
  const expense: ExpenseItem = {
    id: newId(),
    description: desc,
    amountCents: input.amountCents,
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
  patch: Partial<Pick<ExpenseItem, "description" | "amountCents" | "day" | "propertyId">>,
): BnbData {
  const d = asV3(data);
  const t = nowIso();
  return {
    ...d,
    months: d.months.map((m) => {
      if (m.id !== monthId) return m;
      const next = m.expenses.map((e) => {
        if (e.id !== expenseId) return e;
        const nextDesc = patch.description !== undefined ? patch.description.trim() : e.description;
        const nextAmount = patch.amountCents !== undefined ? patch.amountCents : e.amountCents;
        const nextDay = patch.day !== undefined ? patch.day : e.day;
        const nextProp = patch.propertyId !== undefined ? patch.propertyId : e.propertyId;
        if (!nextDesc) return e;
        if (!Number.isFinite(nextAmount)) return e;
        if (nextDay !== undefined && (!Number.isInteger(nextDay) || nextDay < 1 || nextDay > 31))
          return e;
        return {
          ...e,
          description: nextDesc,
          amountCents: nextAmount,
          propertyId: nextProp,
          day: nextDay,
          updatedAt: t,
        };
      });
      return { ...m, expenses: next, updatedAt: t };
    }),
  };
}

export function deleteExpense(data: BnbData, monthId: string, expenseId: string): BnbData {
  const d = asV3(data);
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

