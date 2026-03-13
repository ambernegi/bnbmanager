"use client";

import { useMemo, useState } from "react";
import type { BnbData, ExpenseItem, Property } from "@/lib/bnb/types";
import {
  addExpense,
  addProperty,
  addMonth,
  deleteExpense,
  deleteMonth,
  setNotes,
  setPropertyRent,
  setPropertyTenure,
  setSettings,
  updateExpense,
} from "@/lib/bnb/mutations";
import {
  formatMonthLabel,
  formatMoney,
  getDefaultNewMonth,
  getCurrencyFractionDigits,
  getMonthTotals,
  isValidMonthKey,
  parseMoneyToCents,
} from "@/lib/bnb/utils";
import { useBnbData } from "@/lib/bnb/useBnbData";
import { downloadTextFile, monthToCsv } from "@/lib/bnb/export";
import { ConfirmDialog } from "@/app/_components/ui/ConfirmDialog";
import { MetricCard } from "@/app/_components/ui/MetricCard";
import { Sparkline } from "@/app/_components/ui/Sparkline";
import { Toaster, useToasts } from "@/app/_components/ui/Toast";
import { MoneyDrum } from "@/app/_components/ui/MoneyDrum";

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "good" | "bad";
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-200"
      : tone === "bad"
        ? "bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-200"
        : "bg-zinc-50 text-zinc-800 ring-zinc-600/20 dark:bg-zinc-900/40 dark:text-zinc-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {children}
      </h2>
    </div>
  );
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm",
        "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-100/20",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "min-h-[96px] w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm",
        "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-100/20",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Button({
  children,
  variant = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const cls =
    variant === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
      : variant === "secondary"
        ? "bg-white text-zinc-950 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-800 dark:hover:bg-zinc-900"
        : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200";

  return (
    <button
      {...rest}
      className={[
        "inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        cls,
        rest.className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// (MoneyField removed) We now edit rent/expense amounts directly with per-property inputs.

export function BnbManagerApp() {
  const { data, setData, loaded } = useBnbData();
  const { toasts, push: toast, dismiss: dismissToast } = useToasts();
  const settings =
    data.version === 3
      ? data.settings
      : data.version === 2
        ? { ...data.settings, properties: [{ id: "prop_default", name: "Property 1" }] }
        : { currency: "INR", locale: "en-IN", properties: [{ id: "prop_default", name: "Property 1" }] };
  const moneyOpts = { currency: settings.currency, locale: settings.locale };
  const fractionDigits = getCurrencyFractionDigits(settings.locale, settings.currency);
  const monthsSorted = useMemo(() => {
    const months = [...data.months];
    months.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
    return months;
  }, [data.months]);

  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const selected = useMemo(() => {
    const first = monthsSorted[0] ?? null;
    if (!selectedMonthId) return first;
    return monthsSorted.find((m) => m.id === selectedMonthId) ?? first;
  }, [monthsSorted, selectedMonthId]);

  const [newMonthKey, setNewMonthKey] = useState<string>(getDefaultNewMonth());
  const [newExpenseDesc, setNewExpenseDesc] = useState<string>("");
  const [newExpenseAmount, setNewExpenseAmount] = useState<string>("");
  const [newExpenseDay, setNewExpenseDay] = useState<string>("");
  const [newExpensePropertyId, setNewExpensePropertyId] = useState<string>(
    settings.properties[0]?.id ?? "prop_default",
  );
  const [newPropertyName, setNewPropertyName] = useState<string>("");
  const [expenseQuery, setExpenseQuery] = useState<string>("");
  const [expenseSort, setExpenseSort] = useState<"day" | "amount" | "recent">("day");
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "month"; monthId: string }
    | { kind: "expense"; monthId: string; expenseId: string }
  >(null);

  const selectedTotals = selected ? getMonthTotals(selected) : null;
  const profitTrend = useMemo(() => {
    const asc = [...data.months].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
    const last = asc.slice(Math.max(0, asc.length - 12));
    return last.map((m) => getMonthTotals(m).profitCents);
  }, [data.months]);
  const visibleExpenses = useMemo(() => {
    if (!selected) return [];
    const q = expenseQuery.trim().toLowerCase();
    const filtered = q
      ? selected.expenses.filter((e) => e.description.toLowerCase().includes(q))
      : selected.expenses;
    return [...filtered].sort((a, b) => {
      if (expenseSort === "amount") return b.amountCents - a.amountCents;
      if (expenseSort === "recent") return b.updatedAt.localeCompare(a.updatedAt);
      return (a.day ?? 999) - (b.day ?? 999);
    });
  }, [selected, expenseQuery, expenseSort]);

  function commit(next: BnbData) {
    setData(next);
  }

  function onAddMonth() {
    const mk = newMonthKey.trim();
    if (!isValidMonthKey(mk)) return;
    const next = addMonth(data, mk);
    commit(next);
    const created = next.months.find((m) => m.month === mk);
    if (created) setSelectedMonthId(created.id);
    toast(`Added ${formatMonthLabel(mk)}`, "good");
  }

  function onAddExpense() {
    if (!selected) return;
    const desc = newExpenseDesc.trim();
    const cents = parseMoneyToCents(newExpenseAmount, fractionDigits);
    if (!desc) return;
    if (cents === null) return;
    const day = newExpenseDay.trim() ? Number(newExpenseDay) : undefined;
    if (day !== undefined && (!Number.isInteger(day) || day < 1 || day > 31)) return;

    commit(
      addExpense(data, selected.id, {
        description: desc,
        amountCents: cents,
        day,
        propertyId: newExpensePropertyId || undefined,
      }),
    );
    setNewExpenseDesc("");
    setNewExpenseAmount("");
    setNewExpenseDay("");
    toast("Expense added", "good");
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-7 w-56 rounded bg-zinc-200/60 dark:bg-zinc-800/60" />
          <div className="mt-6 grid gap-4 md:grid-cols-[320px_1fr]">
            <div className="h-80 rounded-xl bg-zinc-200/40 dark:bg-zinc-800/40" />
            <div className="h-80 rounded-xl bg-zinc-200/40 dark:bg-zinc-800/40" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            BnB Manager
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Track monthly income, expenses, and profit/loss. Data is saved locally in
            your browser.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="grid gap-1">
              <SmallLabel>Currency</SmallLabel>
              <select
                value={settings.currency}
                onChange={(e) => commit(setSettings(data, { currency: e.target.value }))}
                className="h-10 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                {["INR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <SmallLabel>Location / Locale</SmallLabel>
              <select
                value={settings.locale}
                onChange={(e) => commit(setSettings(data, { locale: e.target.value }))}
                className="h-10 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                {[
                  { v: "en-IN", l: "India (en-IN)" },
                  { v: "hi-IN", l: "India (hi-IN)" },
                  { v: "en-US", l: "United States (en-US)" },
                  { v: "en-GB", l: "United Kingdom (en-GB)" },
                ].map((x) => (
                  <option key={x.v} value={x.v}>
                    {x.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TextInput
              type="month"
              value={newMonthKey}
              onChange={(e) => setNewMonthKey(e.target.value)}
              aria-label="Month to add"
              className="w-[170px]"
            />
            <Button onClick={onAddMonth} disabled={!isValidMonthKey(newMonthKey)}>
              Add month
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <MetricCard
          label={selected ? `Income • ${formatMonthLabel(selected.month)}` : "Income"}
          value={
            selectedTotals
              ? formatMoney(selectedTotals.incomeCents, moneyOpts)
              : formatMoney(0, moneyOpts)
          }
        />
        <MetricCard
          label={selected ? `Expenses • ${formatMonthLabel(selected.month)}` : "Expenses"}
          value={
            selectedTotals
              ? formatMoney(selectedTotals.expensesCents, moneyOpts)
              : formatMoney(0, moneyOpts)
          }
        />
        <MetricCard
          label={selected ? `Profit/Loss • ${formatMonthLabel(selected.month)}` : "Profit/Loss"}
          value={
            selectedTotals
              ? formatMoney(selectedTotals.profitCents, moneyOpts)
              : formatMoney(0, moneyOpts)
          }
          sub="Income − expenses"
        />
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Profit trend (last 12 months)
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-500">{profitTrend.length}</div>
          </div>
          <div className="mt-2">
            <Sparkline values={profitTrend} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <SectionTitle>Months</SectionTitle>
            <Pill tone="neutral">{monthsSorted.length}</Pill>
          </div>

          <div className="mt-3 space-y-2">
            {monthsSorted.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                Add your first month to start tracking.
              </div>
            ) : (
              monthsSorted.map((m) => {
                const totals = getMonthTotals(m);
                const selectedCls =
                  selected?.id === m.id
                    ? "ring-2 ring-zinc-900/10 dark:ring-zinc-100/10"
                    : "ring-1 ring-zinc-200 dark:ring-zinc-800";
                const profitTone =
                  totals.profitCents > 0 ? "good" : totals.profitCents < 0 ? "bad" : "neutral";
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMonthId(m.id)}
                    className={[
                      "w-full rounded-xl bg-white p-3 text-left shadow-sm transition hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900",
                      selectedCls,
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        {formatMonthLabel(m.month)}
                      </div>
                      <Pill tone={profitTone}>{formatMoney(totals.profitCents, moneyOpts)}</Pill>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <div>
                        <span className="font-medium">Income:</span>{" "}
                        {formatMoney(totals.incomeCents, moneyOpts)}
                      </div>
                      <div>
                        <span className="font-medium">Expenses:</span>{" "}
                        {formatMoney(totals.expensesCents, moneyOpts)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {!selected ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              Create a month to start tracking.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {formatMonthLabel(selected.month)}
                  </h2>
                  {selectedTotals && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="neutral">
                        Expenses: {formatMoney(selectedTotals.expensesCents, moneyOpts)}
                      </Pill>
                      <Pill tone="neutral">
                        Income: {formatMoney(selectedTotals.incomeCents, moneyOpts)}
                      </Pill>
                      <Pill
                        tone={
                          selectedTotals.profitCents > 0
                            ? "good"
                            : selectedTotals.profitCents < 0
                              ? "bad"
                              : "neutral"
                        }
                      >
                        Profit/Loss: {formatMoney(selectedTotals.profitCents, moneyOpts)}
                      </Pill>
                    </div>
                  )}
                </div>

                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirm({ kind: "month", monthId: selected.id });
                  }}
                >
                  Delete month
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <SmallLabel>Properties</SmallLabel>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TextInput
                        placeholder="Add property (e.g. Goa Studio)"
                        value={newPropertyName}
                        onChange={(e) => setNewPropertyName(e.target.value)}
                      />
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const name = newPropertyName.trim();
                          if (!name) return;
                          commit(addProperty(data, name));
                          setNewPropertyName("");
                          toast("Property added", "good");
                        }}
                      >
                        Add
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      {settings.properties.map((p: Property) => {
                        const rent =
                          selected.properties?.find((x) => x.propertyId === p.id)?.rentCents ?? 0;
                        const opCost = selected.expenses
                          .filter((e) => (e.propertyId ?? settings.properties[0]?.id) === p.id)
                          .reduce((sum, e) => sum + e.amountCents, 0);
                        const maxRent = Math.max(
                          1,
                          ...settings.properties.map(
                            (pp) =>
                              selected.properties?.find((x) => x.propertyId === pp.id)?.rentCents ??
                              0,
                          ),
                        );
                        return (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                  {p.name}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                                  <Pill tone="neutral">
                                    Rent: {formatMoney(rent, moneyOpts)}
                                  </Pill>
                                  <Pill tone="neutral">
                                    Op cost: {formatMoney(opCost, moneyOpts)}
                                  </Pill>
                                </div>
                              </div>
                              <MoneyDrum
                                rentMinor={rent}
                                operatingCostMinor={opCost}
                                scaleMaxMinor={maxRent}
                                variant={p.tenure === "owned" ? "owned" : "rented"}
                              />
                            </div>
                            <div className="mt-3 grid gap-2">
                              <div className="grid gap-1">
                                <SmallLabel>Tenure</SmallLabel>
                                <select
                                  value={p.tenure ?? "owned"}
                                  onChange={(e) => {
                                    const next = e.target.value === "rented" ? "rented" : "owned";
                                    commit(setPropertyTenure(data, p.id, next));
                                    toast(`Set ${p.name} to ${next}`, "neutral");
                                  }}
                                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                                >
                                  <option value="owned">Owned</option>
                                  <option value="rented">Rented</option>
                                </select>
                              </div>
                              <SmallLabel>Rent (monthly)</SmallLabel>
                              <TextInput
                                inputMode="decimal"
                                placeholder="0"
                                defaultValue={
                                  rent ? String(rent / Math.pow(10, fractionDigits)) : ""
                                }
                                onBlur={(e) => {
                                  const next = parseMoneyToCents(
                                    e.target.value,
                                    fractionDigits,
                                  );
                                  if (next === null) return;
                                  commit(setPropertyRent(data, selected.id, p.id, next));
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <SmallLabel>Notes (optional)</SmallLabel>
                  <TextArea
                    placeholder="Cleaning schedule, special events, repairs..."
                    value={selected.notes ?? ""}
                    onChange={(e) => commit(setNotes(data, selected.id, e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>Expenses</SectionTitle>
                  <Pill tone="neutral">{selected.expenses.length}</Pill>
                </div>

                <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/20">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <TextInput
                      placeholder="Search expenses…"
                      value={expenseQuery}
                      onChange={(e) => setExpenseQuery(e.target.value)}
                      className="sm:max-w-xs"
                    />
                    <div className="flex items-center gap-2">
                      <SmallLabel>Sort</SmallLabel>
                      <div className="flex rounded-lg ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800">
                        <button
                          type="button"
                          onClick={() => setExpenseSort("day")}
                          className={[
                            "h-10 px-3 text-sm font-medium",
                            expenseSort === "day"
                              ? "bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
                              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                            "rounded-l-lg",
                          ].join(" ")}
                        >
                          Day
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseSort("amount")}
                          className={[
                            "h-10 px-3 text-sm font-medium",
                            expenseSort === "amount"
                              ? "bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
                              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                          ].join(" ")}
                        >
                          Amount
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseSort("recent")}
                          className={[
                            "h-10 px-3 text-sm font-medium",
                            expenseSort === "recent"
                              ? "bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
                              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                            "rounded-r-lg",
                          ].join(" ")}
                        >
                          Recent
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <SmallLabel>Quick add</SmallLabel>
                    {["Cleaning", "Supplies", "Utilities", "Repairs", "Maintenance"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewExpenseDesc(s)}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-800 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800 dark:hover:bg-zinc-900"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    Export downloads an Excel-friendly CSV for this month.
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const csv = monthToCsv(selected, moneyOpts);
                      downloadTextFile(`bnb-finances-${selected.month}.csv`, csv);
                      toast("Export downloaded", "good");
                    }}
                  >
                    Export (Excel)
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Day</th>
                        <th className="px-3 py-2 text-left font-semibold">Description</th>
                        <th className="px-3 py-2 text-right font-semibold">Amount</th>
                        <th className="px-3 py-2 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                      {selected.expenses.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-400"
                          >
                            No expenses yet.
                          </td>
                        </tr>
                      ) : (
                        visibleExpenses.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-400"
                            >
                              No matching expenses.
                            </td>
                          </tr>
                        ) : (
                          visibleExpenses.map((ex) => (
                            <ExpenseRow
                              key={ex.id}
                              expense={ex}
                              properties={settings.properties}
                              fractionDigits={fractionDigits}
                              onUpdate={(patch) =>
                                commit(updateExpense(data, selected.id, ex.id, patch))
                              }
                              onRequestDelete={() =>
                                setConfirm({
                                  kind: "expense",
                                  monthId: selected.id,
                                  expenseId: ex.id,
                                })
                              }
                            />
                          ))
                        )
                      )}

                      <tr className="bg-zinc-50/60 dark:bg-zinc-900/30">
                        <td className="px-3 py-2 align-top">
                          <TextInput
                            inputMode="numeric"
                            placeholder="1-31"
                            value={newExpenseDay}
                            onChange={(e) => setNewExpenseDay(e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <TextInput
                            placeholder="e.g. Cleaning, supplies, utilities"
                            value={newExpenseDesc}
                            onChange={(e) => setNewExpenseDesc(e.target.value)}
                          />
                          <div className="mt-2">
                            <select
                              value={newExpensePropertyId}
                              onChange={(e) => setNewExpensePropertyId(e.target.value)}
                              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                            >
                              {settings.properties.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <TextInput
                            inputMode="decimal"
                            placeholder="0.00"
                            value={newExpenseAmount}
                            onChange={(e) => setNewExpenseAmount(e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <Button
                            variant="secondary"
                            onClick={onAddExpense}
                            disabled={
                              !newExpenseDesc.trim() ||
                              parseMoneyToCents(newExpenseAmount, fractionDigits) === null
                            }
                          >
                            Add
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="mt-10 text-xs text-zinc-500 dark:text-zinc-500">
        Tip: Because this uses <span className="font-medium">localStorage</span>, your data stays in
        this browser/device. For multi-device sync, we can add an auth-backed database later.
      </footer>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === "month"
            ? "Delete month?"
            : confirm?.kind === "expense"
              ? "Delete expense?"
              : "Confirm"
        }
        description={
          confirm?.kind === "month"
            ? "This removes the month and all its expenses."
            : confirm?.kind === "expense"
              ? "This removes the expense line item."
              : undefined
        }
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "month") {
            const month = data.months.find((m) => m.id === confirm.monthId);
            commit(deleteMonth(data, confirm.monthId));
            setSelectedMonthId(null);
            toast(month ? `Deleted ${formatMonthLabel(month.month)}` : "Month deleted", "neutral");
            return;
          }
          commit(deleteExpense(data, confirm.monthId, confirm.expenseId));
          toast("Expense deleted", "neutral");
        }}
      />

      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function ExpenseRow({
  expense,
  properties,
  fractionDigits,
  onUpdate,
  onRequestDelete,
}: {
  expense: ExpenseItem;
  properties: Property[];
  fractionDigits: number;
  onUpdate: (patch: Partial<Pick<ExpenseItem, "description" | "amountCents" | "day" | "propertyId">>) => void;
  onRequestDelete: () => void;
}) {
  const [desc, setDesc] = useState(expense.description);
  const [amount, setAmount] = useState((expense.amountCents / 100).toFixed(2));
  const [day, setDay] = useState(expense.day ? String(expense.day) : "");
  const [propId, setPropId] = useState(expense.propertyId ?? properties[0]?.id ?? "");

  function commit() {
    const nextDesc = desc.trim();
    if (!nextDesc) return;
    const cents = parseMoneyToCents(amount, fractionDigits);
    if (cents === null) return;
    const nextDay = day.trim() ? Number(day) : undefined;
    if (nextDay !== undefined && (!Number.isInteger(nextDay) || nextDay < 1 || nextDay > 31)) return;
    onUpdate({ description: nextDesc, amountCents: cents, day: nextDay, propertyId: propId || undefined });
  }

  return (
    <tr>
      <td className="px-3 py-2 align-top">
        <TextInput inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} onBlur={commit} />
      </td>
      <td className="px-3 py-2 align-top">
        <TextInput value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={commit} />
        <div className="mt-2">
          <select
            value={propId}
            onChange={(e) => {
              setPropId(e.target.value);
              onUpdate({ propertyId: e.target.value });
            }}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-3 py-2 align-top text-right">
        <TextInput
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => {
            const cents = parseMoneyToCents(amount, fractionDigits);
            if (cents !== null) setAmount((cents / 100).toFixed(2));
            commit();
          }}
        />
      </td>
      <td className="px-3 py-2 align-top text-right">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={commit}>
            Save
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onRequestDelete();
            }}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

