"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { BnbData, ExpenseItem, Property } from "@/lib/bnb/types";
import {
  addExpense,
  addProperty,
  addMonth,
  addBooking,
  deleteExpense,
  deleteBooking,
  deleteMonth,
  setPropertyRent,
  setPropertyListing,
  setPropertyMeta,
  setPropertyName,
  setPropertyTenure,
  setRegion,
  updateExpense,
} from "@/lib/bnb/mutations";
import {
  formatMonthLabel,
  formatMoney,
  getCurrentMonthKey,
  getDefaultNewMonth,
  getCurrencyFractionDigits,
  getMonthTotals,
  isValidMonthKey,
  isMonthKeyInFuture,
  parseMoneyToCents,
} from "@/lib/bnb/utils";
import { useBnbData } from "@/lib/bnb/useBnbData";
import { downloadTextFile, monthToCsv } from "@/lib/bnb/export";
import { ConfirmDialog } from "@/app/_components/ui/ConfirmDialog";
import { MetricCard } from "@/app/_components/ui/MetricCard";
import { Sparkline } from "@/app/_components/ui/Sparkline";
import { Toaster, useToasts } from "@/app/_components/ui/Toast";
import { MoneyDrum } from "@/app/_components/ui/MoneyDrum";
import { ListingIcon } from "@/app/_components/ui/ListingIcons";
import { sanitizeExternalUrl } from "@/lib/bnb/url";
import { buildReminders } from "@/lib/bnb/reminders";
import { buildSummaryRows, type Period } from "@/lib/bnb/analysis";
import { GroupedBarChart, ScatterChart, StackedBarChart } from "@/app/_components/ui/Charts";

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

// Notes removed per product request.

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
  const settings: {
    region?: "india" | "us" | "europe" | "uk";
    currency: string;
    locale: string;
    properties: Property[];
  } = (() => {
    // `loadData()` migrates to the latest version, but keep a safe fallback.
    if ("settings" in data && data.settings && typeof data.settings === "object") {
      const s = data.settings as unknown as {
        region?: "india" | "us" | "europe" | "uk";
        currency?: unknown;
        locale?: unknown;
        properties?: unknown;
      };
      if (typeof s.currency === "string" && typeof s.locale === "string" && Array.isArray(s.properties)) {
        return { region: s.region, currency: s.currency, locale: s.locale, properties: s.properties as Property[] };
      }
    }
    return {
      region: "india",
      currency: "INR",
      locale: "en-IN",
      properties: [{ id: "prop_default", name: "Property 1", tenure: "owned", listings: {} }],
    };
  })();
  const moneyOpts = { currency: settings.currency, locale: settings.locale };
  const fractionDigits = getCurrencyFractionDigits(settings.locale, settings.currency);
  const reminders = buildReminders(settings.properties);
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
  const [newExpenseMode, setNewExpenseMode] = useState<"flat" | "per_day">("flat");
  const [newExpenseRatePerDay, setNewExpenseRatePerDay] = useState<string>("");
  const [newExpenseDays, setNewExpenseDays] = useState<string>("");
  const [newExpensePropertyId, setNewExpensePropertyId] = useState<string>(
    settings.properties[0]?.id ?? "prop_default",
  );
  const [newPropertyName, setNewPropertyName] = useState<string>("");
  const [expandedPropertyIds, setExpandedPropertyIds] = useState<Record<string, boolean>>({});
  const [renamingPropertyId, setRenamingPropertyId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>("");
  const [view, setView] = useState<"tracker" | "analysis">("tracker");
  const [analysisPeriod, setAnalysisPeriod] = useState<Period>("monthly");
  const [analysisPropertyId, setAnalysisPropertyId] = useState<string>("all");
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "month"; monthId: string }
    | { kind: "expense"; monthId: string; expenseId: string }
  >(null);

  const selectedTotals = selected ? getMonthTotals(selected, settings.properties) : null;
  const profitTrend = (() => {
    const asc = [...data.months].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
    const last = asc.slice(Math.max(0, asc.length - 12));
    return last.map((m) => getMonthTotals(m, settings.properties).profitCents);
  })();
  const visibleExpenses = useMemo(() => {
    if (!selected) return [];
    // Keep the list simple: stable sort by day, then recent edits.
    return [...selected.expenses].sort((a, b) => {
      const ad = a.day ?? 999;
      const bd = b.day ?? 999;
      if (ad !== bd) return ad - bd;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [selected]);

  function commit(next: BnbData) {
    setData(next);
  }

  function onAddMonth() {
    const mk = newMonthKey.trim();
    if (!isValidMonthKey(mk)) return;
    const nowKey = getCurrentMonthKey();
    if (isMonthKeyInFuture(mk, nowKey)) {
      toast("You can only add the current or previous months", "bad");
      return;
    }
    const next = addMonth(data, mk);
    commit(next);
    const created = next.months.find((m) => m.month === mk);
    if (created) setSelectedMonthId(created.id);
    toast(`Added ${formatMonthLabel(mk)}`, "good");
  }

  function onAddExpense() {
    if (!selected) return;
    const desc = newExpenseDesc.trim();
    if (!desc) return;
    const day = newExpenseDay.trim() ? Number(newExpenseDay) : undefined;
    if (day !== undefined && (!Number.isInteger(day) || day < 1 || day > 31)) return;

    const rate = parseMoneyToCents(newExpenseRatePerDay, fractionDigits);
    const daysCount = newExpenseDays.trim() ? Number(newExpenseDays) : undefined;
    const cents =
      newExpenseMode === "per_day"
        ? rate !== null && daysCount !== undefined
          ? rate * daysCount
          : null
        : parseMoneyToCents(newExpenseAmount, fractionDigits);
    if (newExpenseMode === "per_day") {
      if (rate === null) return;
      if (daysCount === undefined || !Number.isInteger(daysCount) || daysCount < 1) return;
    }
    if (cents === null || !Number.isFinite(cents)) return;

    commit(
      addExpense(data, selected.id, {
        description: desc,
        amountCents: cents,
        day,
        propertyId: newExpensePropertyId || undefined,
        mode: newExpenseMode,
        rateCentsPerDay: newExpenseMode === "per_day" ? (rate ?? undefined) : undefined,
        days: newExpenseMode === "per_day" ? daysCount : undefined,
      }),
    );
    setNewExpenseDesc("");
    setNewExpenseAmount("");
    setNewExpenseDay("");
    setNewExpenseRatePerDay("");
    setNewExpenseDays("");
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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 sm:h-16 sm:w-16">
            <Image
              src="/hostops-logo.png"
              alt="HostOps logo"
              fill
              priority
              sizes="(min-width: 640px) 64px, 56px"
              className="object-contain opacity-90 mix-blend-multiply dark:mix-blend-screen"
              style={{
                // Fade the edges so the square PNG blends into the page background.
                WebkitMaskImage:
                  "radial-gradient(circle at center, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
                maskImage:
                  "radial-gradient(circle at center, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
              }}
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              HostOps
            </h1>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Run every property with clarity, control, and confidence.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Local-first. Data stays in your browser.{" "}
              <Link className="underline underline-offset-2" href="/help">
                Help
              </Link>
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex rounded-xl ring-1 ring-inset ring-zinc-200 bg-white p-1 shadow-sm dark:ring-zinc-800 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setView("tracker")}
              className={[
                "h-9 rounded-lg px-3 text-sm font-medium",
                view === "tracker"
                  ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
              ].join(" ")}
            >
              Tracker
            </button>
            <button
              type="button"
              onClick={() => setView("analysis")}
              className={[
                "h-9 rounded-lg px-3 text-sm font-medium",
                view === "analysis"
                  ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
              ].join(" ")}
            >
              Analysis
            </button>
            <Link
              href="/help"
              title="Help"
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
                <path d="M12 6.5c-2.1 0-3.7 1.3-3.7 3.1a1 1 0 1 0 2 0c0-.7.7-1.1 1.7-1.1.9 0 1.6.4 1.6 1.1 0 .5-.3.8-1 1.2-1.3.7-2 1.6-2 3.2v.2a1 1 0 1 0 2 0V14c0-1 .3-1.3 1-1.7 1.2-.7 2-1.6 2-3.1 0-1.8-1.6-3.1-3.6-3.1Z" />
                <path d="M12 17.6a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" />
              </svg>
              <span className="sr-only">Help</span>
            </Link>
          </div>
          <div className="flex w-full flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm sm:w-auto sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950">
            <div className="grid gap-1 sm:min-w-[170px]">
              <SmallLabel>Region</SmallLabel>
              <select
                value={settings.region ?? "india"}
                onChange={(e) => {
                  const v = e.target.value as "india" | "us" | "europe" | "uk";
                  commit(setRegion(data, v));
                }}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="india">India (INR)</option>
                <option value="us">US (USD)</option>
                <option value="europe">Europe (EUR)</option>
                <option value="uk">UK (GBP)</option>
              </select>
            </div>
            <div className="grid gap-1 sm:min-w-[110px]">
              <SmallLabel>Currency</SmallLabel>
              <div className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold leading-10 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {settings.currency}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <TextInput
              type="month"
              value={newMonthKey}
              onChange={(e) => setNewMonthKey(e.target.value)}
              aria-label="Month to add"
              max={getCurrentMonthKey()}
              className="w-full sm:w-[170px]"
            />
            <Button className="w-full sm:w-auto" onClick={onAddMonth} disabled={!isValidMonthKey(newMonthKey)}>
              Add month
            </Button>
          </div>
        </div>
      </header>

      {view === "tracker" && reminders.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Reminders
            </div>
            <Pill tone="neutral">{reminders.length}</Pill>
          </div>
          <div className="mt-3 grid gap-2">
            {reminders.slice(0, 6).map((r) => (
              <div
                key={`${r.kind}:${r.propertyId}:${r.message}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/20"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-zinc-950 dark:text-zinc-50">
                    {r.propertyName}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">{r.message}</div>
                </div>
                <Pill tone={r.severity === "bad" ? "bad" : r.severity === "warn" ? "neutral" : "neutral"}>
                  {r.kind === "agreement" ? "Agreement" : "Rent"}
                </Pill>
              </div>
            ))}
            {reminders.length > 6 ? (
              <div className="text-xs text-zinc-500 dark:text-zinc-500">
                Showing 6 of {reminders.length}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {view === "analysis" ? (
        <AnalysisPanel
          data={data}
          properties={settings.properties}
          moneyOpts={moneyOpts}
          period={analysisPeriod}
          setPeriod={setAnalysisPeriod}
          propertyId={analysisPropertyId}
          setPropertyId={setAnalysisPropertyId}
        />
      ) : null}

      {view === "tracker" ? (
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <MetricCard
          label={selected ? `Revenue • ${formatMonthLabel(selected.month)}` : "Revenue"}
          value={
            selectedTotals
              ? formatMoney(selectedTotals.incomeCents, moneyOpts)
              : formatMoney(0, moneyOpts)
          }
        />
        <MetricCard
          label={selected ? `Costs • ${formatMonthLabel(selected.month)}` : "Costs"}
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
      ) : null}

      {view === "tracker" ? (
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
                const totals = getMonthTotals(m, settings.properties);
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
                        <span className="font-medium">Revenue:</span>{" "}
                        {formatMoney(totals.incomeCents, moneyOpts)}
                      </div>
                      <div>
                        <span className="font-medium">Costs:</span>{" "}
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
                        Costs: {formatMoney(selectedTotals.expensesCents, moneyOpts)}
                      </Pill>
                      <Pill tone="neutral">
                        Revenue: {formatMoney(selectedTotals.incomeCents, moneyOpts)}
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <TextInput
                        placeholder="Add property (e.g. Goa Studio)"
                        value={newPropertyName}
                        onChange={(e) => setNewPropertyName(e.target.value)}
                      />
                      <Button
                        variant="secondary"
                        className="w-full sm:w-auto"
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
                        const baseRentCost =
                          p.tenure === "rented"
                            ? (selected.properties?.find((x) => x.propertyId === p.id)?.rentCents ??
                              0)
                            : 0;
                        const operatingCost = selected.expenses
                          .filter((e) => (e.propertyId ?? settings.properties[0]?.id) === p.id)
                          .reduce((sum, e) => sum + e.amountCents, 0);
                        const revenue = (selected.bookings ?? [])
                          .filter((b) => b.propertyId === p.id)
                          .reduce((sum, b) => sum + b.pricePerNightCents * b.nights, 0);
                        const totalCost = baseRentCost + operatingCost;
                        const profit = revenue - totalCost;
                        const maxCost = Math.max(
                          1,
                          ...settings.properties.map((pp) => {
                            const br =
                              pp.tenure === "rented"
                                ? (selected.properties?.find((x) => x.propertyId === pp.id)?.rentCents ??
                                  0)
                                : 0;
                            const oc = selected.expenses
                              .filter((e) => (e.propertyId ?? settings.properties[0]?.id) === pp.id)
                              .reduce((s, e) => s + e.amountCents, 0);
                            return br + oc;
                          }),
                        );
                        return (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  {renamingPropertyId === p.id ? (
                                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                                      <TextInput
                                        value={renameDraft}
                                        onChange={(e) => setRenameDraft(e.target.value)}
                                        className="h-9"
                                        placeholder="Property name"
                                      />
                                      <Button
                                        variant="secondary"
                                        className="h-9 w-full sm:w-auto"
                                        onClick={() => {
                                          const next = renameDraft.trim();
                                          if (!next) return;
                                          commit(setPropertyName(data, p.id, next));
                                          setRenamingPropertyId(null);
                                          toast("Property renamed", "good");
                                        }}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        className="h-9 w-full sm:w-auto"
                                        onClick={() => setRenamingPropertyId(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                        {p.name}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRenamingPropertyId(p.id);
                                          setRenameDraft(p.name);
                                        }}
                                        className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                                      >
                                        Rename
                                      </button>
                                    </>
                                  )}
                                </div>
                                {(() => {
                                  if (!p.agreementValidUntil) return null;
                                  const daysLeft = daysUntilLocalDate(p.agreementValidUntil);
                                  if (daysLeft === null) return null;
                                  // "Only 1 month left" => within 30 days.
                                  if (daysLeft > 30) return null;
                                  if (daysLeft < 0) {
                                    return <Pill tone="bad">Agreement expired</Pill>;
                                  }
                                  return (
                                    <Pill tone={daysLeft <= 7 ? "bad" : "neutral"}>
                                      Renew in {daysLeft} day(s)
                                    </Pill>
                                  );
                                })()}
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                                  <Pill tone="neutral">
                                    Revenue: {formatMoney(revenue, moneyOpts)}
                                  </Pill>
                                  <Pill tone="neutral">
                                    Cost: {formatMoney(totalCost, moneyOpts)}
                                  </Pill>
                                  <Pill tone={profit > 0 ? "good" : profit < 0 ? "bad" : "neutral"}>
                                    Profit: {formatMoney(profit, moneyOpts)}
                                  </Pill>
                                </div>

                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {(() => {
                                      const link = p.listings?.airbnb;
                                      const href = link?.url ? sanitizeExternalUrl(link.url) : undefined;
                                      return (
                                        <ListingIcon
                                          provider="airbnb"
                                          active={Boolean(link?.active && href)}
                                          href={href ?? undefined}
                                        />
                                      );
                                    })()}
                                    {(() => {
                                      const link = p.listings?.booking;
                                      const href = link?.url ? sanitizeExternalUrl(link.url) : undefined;
                                      return (
                                        <ListingIcon
                                          provider="booking"
                                          active={Boolean(link?.active && href)}
                                          href={href ?? undefined}
                                        />
                                      );
                                    })()}
                                    {(() => {
                                      const link = p.listings?.other;
                                      const href = link?.url ? sanitizeExternalUrl(link.url) : undefined;
                                      return (
                                        <ListingIcon
                                          provider="other"
                                          active={Boolean(link?.active && href)}
                                          href={href ?? undefined}
                                        />
                                      );
                                    })()}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedPropertyIds((prev) => ({
                                        ...prev,
                                        [p.id]: !prev[p.id],
                                      }))
                                    }
                                    className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                                  >
                                    {expandedPropertyIds[p.id] ? "Collapse" : "Expand"}
                                  </button>
                                </div>
                              </div>
                              <div className="self-end sm:self-auto">
                                <MoneyDrum
                                  revenueMinor={revenue}
                                  totalCostMinor={totalCost}
                                  baseRentMinor={baseRentCost}
                                  operatingCostMinor={operatingCost}
                                  scaleMaxMinor={maxCost}
                                  variant={p.tenure === "owned" ? "owned" : "rented"}
                                />
                              </div>
                            </div>

                            {expandedPropertyIds[p.id] ? (
                              <div className="mt-3 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/20">
                                <SmallLabel>Listing links</SmallLabel>
                                {(["airbnb", "booking", "other"] as const).map((provider) => {
                                  const current = p.listings?.[provider] ?? { url: "", active: false };
                                  return (
                                    <div key={provider} className="grid gap-2 sm:grid-cols-[120px_1fr_110px] sm:items-center">
                                      <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        {provider === "airbnb"
                                          ? "Airbnb"
                                          : provider === "booking"
                                            ? "Booking.com"
                                            : "Other"}
                                      </div>
                                      <TextInput
                                        placeholder="https://..."
                                        defaultValue={current.url}
                                        onBlur={(e) => {
                                          const raw = e.target.value;
                                          const sanitized = sanitizeExternalUrl(raw);
                                          if (sanitized === null) {
                                            toast("Invalid URL (must be http/https)", "bad");
                                            return;
                                          }
                                          commit(setPropertyListing(data, p.id, provider, { url: sanitized }));
                                          toast("Link saved", "good");
                                        }}
                                      />
                                      <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                        <input
                                          type="checkbox"
                                          checked={current.active}
                                          onChange={(e) => {
                                            commit(setPropertyListing(data, p.id, provider, { active: e.target.checked }));
                                          }}
                                        />
                                        Active
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                            {expandedPropertyIds[p.id] ? (
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
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-1">
                                  <SmallLabel>Rent due on (day)</SmallLabel>
                                  <TextInput
                                    inputMode="numeric"
                                    placeholder="1-31"
                                    defaultValue={p.rentDueDay ? String(p.rentDueDay) : ""}
                                    onBlur={(e) => {
                                      const raw = e.target.value.trim();
                                      if (raw === "") {
                                        commit(setPropertyMeta(data, p.id, { rentDueDay: null }));
                                        return;
                                      }
                                      const day = Number(raw);
                                      if (!Number.isInteger(day) || day < 1 || day > 31) {
                                        toast("Rent due day must be 1–31", "bad");
                                        return;
                                      }
                                      commit(setPropertyMeta(data, p.id, { rentDueDay: day }));
                                      toast("Rent due day saved", "good");
                                    }}
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <SmallLabel>Agreement valid until</SmallLabel>
                                  <TextInput
                                    type="date"
                                    defaultValue={p.agreementValidUntil ?? ""}
                                    onBlur={(e) => {
                                      const v = e.target.value.trim();
                                      if (v === "") {
                                        commit(setPropertyMeta(data, p.id, { agreementValidUntil: null }));
                                        return;
                                      }
                                      // Basic validation: YYYY-MM-DD from input[type=date]
                                      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)) {
                                        toast("Invalid date", "bad");
                                        return;
                                      }
                                      commit(setPropertyMeta(data, p.id, { agreementValidUntil: v }));
                                      toast("Agreement date saved", "good");
                                    }}
                                  />
                                </div>
                              </div>
                              {p.tenure === "rented" ? (
                                <>
                                  <SmallLabel>Base rent cost (monthly)</SmallLabel>
                                  <TextInput
                                    inputMode="decimal"
                                    placeholder="0"
                                    defaultValue={
                                      baseRentCost
                                        ? String(baseRentCost / Math.pow(10, fractionDigits))
                                        : ""
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
                                </>
                              ) : (
                                <div className="text-xs text-zinc-500 dark:text-zinc-500">
                                  Owned property: base rent cost is assumed to be 0.
                                </div>
                              )}

                              <BookingMini
                                property={p}
                                bookings={selected.bookings ?? []}
                                fractionDigits={fractionDigits}
                                onAdd={(input) => {
                                  commit(addBooking(data, selected.id, input));
                                  toast("Booking added", "good");
                                }}
                                onDelete={(bookingId) => {
                                  commit(deleteBooking(data, selected.id, bookingId));
                                  toast("Booking deleted", "neutral");
                                }}
                              />
                            </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {/* Notes removed */}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle>Expenses</SectionTitle>
                  <Pill tone="neutral">{selected.expenses.length}</Pill>
                </div>

                <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <SmallLabel>Quick add</SmallLabel>
                    {["Cleaning", "Supplies", "Utilities", "Repairs", "Maintenance", "Other"].map((s) => (
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
                      const csv = monthToCsv(selected, { ...moneyOpts, properties: settings.properties });
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
                        <th className="px-3 py-2 text-right font-semibold">Monthly cost</th>
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
                        visibleExpenses.map((ex) => (
                          <ExpenseRow
                            key={ex.id}
                            expense={ex}
                            properties={settings.properties}
                            fractionDigits={fractionDigits}
                            moneyOpts={moneyOpts}
                            onUpdate={(patch) => commit(updateExpense(data, selected.id, ex.id, patch))}
                            onRequestDelete={() =>
                              setConfirm({
                                kind: "expense",
                                monthId: selected.id,
                                expenseId: ex.id,
                              })
                            }
                          />
                        ))
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
                          <div className="grid gap-2">
                            <select
                              value={newExpenseMode}
                              onChange={(e) =>
                                setNewExpenseMode(e.target.value === "per_day" ? "per_day" : "flat")
                              }
                              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                            >
                              <option value="flat">Flat amount</option>
                              <option value="per_day">Per-day amount</option>
                            </select>
                            {newExpenseMode === "per_day" ? (
                              <div className="grid grid-cols-2 gap-2">
                                <TextInput
                                  inputMode="decimal"
                                  placeholder="Rate/day"
                                  value={newExpenseRatePerDay}
                                  onChange={(e) => setNewExpenseRatePerDay(e.target.value)}
                                />
                                <TextInput
                                  inputMode="numeric"
                                  placeholder="Days"
                                  value={newExpenseDays}
                                  onChange={(e) => setNewExpenseDays(e.target.value)}
                                />
                              </div>
                            ) : null}
                          </div>
                          {newExpenseMode === "flat" ? (
                            <TextInput
                              inputMode="decimal"
                              placeholder="0.00"
                              value={newExpenseAmount}
                              onChange={(e) => setNewExpenseAmount(e.target.value)}
                            />
                          ) : (
                            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                              Monthly cost:{" "}
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {(() => {
                                  const rate = parseMoneyToCents(newExpenseRatePerDay, fractionDigits);
                                  const d = newExpenseDays.trim() ? Number(newExpenseDays) : NaN;
                                  if (rate === null || !Number.isInteger(d) || d < 1) return "—";
                                  return formatMoney(rate * d, moneyOpts);
                                })()}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <Button
                            variant="secondary"
                            onClick={onAddExpense}
                            disabled={
                              !newExpenseDesc.trim() ||
                              (newExpenseMode === "flat"
                                ? parseMoneyToCents(newExpenseAmount, fractionDigits) === null
                                : parseMoneyToCents(newExpenseRatePerDay, fractionDigits) === null ||
                                  !Number.isInteger(Number(newExpenseDays.trim())) ||
                                  Number(newExpenseDays.trim()) < 1)
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
      ) : null}

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
  moneyOpts,
  onUpdate,
  onRequestDelete,
}: {
  expense: ExpenseItem;
  properties: Property[];
  fractionDigits: number;
  moneyOpts: { currency: string; locale: string };
  onUpdate: (
    patch: Partial<
      Pick<
        ExpenseItem,
        "description" | "amountCents" | "day" | "propertyId" | "mode" | "rateCentsPerDay" | "days"
      >
    >,
  ) => void;
  onRequestDelete: () => void;
}) {
  const [desc, setDesc] = useState(expense.description);
  const [mode, setMode] = useState<"flat" | "per_day">(expense.mode ?? "flat");
  const unit = Math.pow(10, fractionDigits);
  const [amount, setAmount] = useState((expense.amountCents / unit).toFixed(fractionDigits));
  const [ratePerDay, setRatePerDay] = useState(
    expense.rateCentsPerDay ? (expense.rateCentsPerDay / unit).toFixed(fractionDigits) : "",
  );
  const [daysCount, setDaysCount] = useState(expense.days ? String(expense.days) : "");
  const [day, setDay] = useState(expense.day ? String(expense.day) : "");
  const [propId, setPropId] = useState(expense.propertyId ?? properties[0]?.id ?? "");

  function commit() {
    const nextDesc = desc.trim();
    if (!nextDesc) return;
    const rate = parseMoneyToCents(ratePerDay, fractionDigits);
    const dcount = daysCount.trim() ? Number(daysCount) : undefined;
    const cents =
      mode === "per_day"
        ? rate !== null && dcount !== undefined
          ? rate * dcount
          : null
        : parseMoneyToCents(amount, fractionDigits);
    if (mode === "per_day") {
      if (rate === null) return;
      if (dcount === undefined || !Number.isInteger(dcount) || dcount < 1) return;
    }
    if (cents === null || !Number.isFinite(cents)) return;
    const nextDay = day.trim() ? Number(day) : undefined;
    if (nextDay !== undefined && (!Number.isInteger(nextDay) || nextDay < 1 || nextDay > 31)) return;
    onUpdate({
      description: nextDesc,
      amountCents: cents,
      day: nextDay,
      propertyId: propId || undefined,
      mode,
      rateCentsPerDay: mode === "per_day" ? (rate ?? undefined) : undefined,
      days: mode === "per_day" ? dcount : undefined,
    });
  }

  const monthlyCostCents =
    mode === "per_day" && expense.rateCentsPerDay && expense.days
      ? expense.rateCentsPerDay * expense.days
      : expense.amountCents;

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
        <div className="grid gap-2">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(monthlyCostCents, moneyOpts)}
          </div>
          <select
            value={mode}
            onChange={(e) => {
              const next = e.target.value === "per_day" ? "per_day" : "flat";
              setMode(next);
              onUpdate({ mode: next });
            }}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="flat">Flat</option>
            <option value="per_day">Per-day</option>
          </select>

          {mode === "per_day" ? (
            <div className="grid grid-cols-2 gap-2">
              <TextInput
                inputMode="decimal"
                value={ratePerDay}
                onChange={(e) => setRatePerDay(e.target.value)}
                onBlur={commit}
                placeholder="Rate/day"
              />
              <TextInput
                inputMode="numeric"
                value={daysCount}
                onChange={(e) => setDaysCount(e.target.value)}
                onBlur={commit}
                placeholder="Days"
              />
            </div>
          ) : null}

          {mode === "flat" ? (
            <TextInput
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => {
                const cents = parseMoneyToCents(amount, fractionDigits);
                if (cents !== null) setAmount((cents / unit).toFixed(fractionDigits));
                commit();
              }}
            />
          ) : (
            <div className="text-[11px] text-zinc-500 dark:text-zinc-500">Monthly cost is rate/day × days.</div>
          )}
        </div>
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

function daysUntilLocalDate(dateStr: string): number | null {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const end = new Date(y, m - 1, d);
  if (!Number.isFinite(end.getTime())) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffMs = startOfEnd.getTime() - startOfToday.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function BookingMini({
  property,
  bookings,
  fractionDigits,
  onAdd,
  onDelete,
}: {
  property: Property;
  bookings: { id: string; propertyId: string; day?: number; nights: number; pricePerNightCents: number }[];
  fractionDigits: number;
  onAdd: (input: { propertyId: string; nights: number; pricePerNightCents: number; day?: number }) => void;
  onDelete: (bookingId: string) => void;
}) {
  const [day, setDay] = useState<string>("");
  const [nights, setNights] = useState<string>("1");
  const [ppn, setPpn] = useState<string>("");

  const list = bookings.filter((b) => b.propertyId === property.id);
  const byDay = useMemo(() => {
    const m = new Map<number, typeof list>();
    for (const b of list) {
      if (!b.day) continue;
      const arr = m.get(b.day) ?? [];
      arr.push(b);
      m.set(b.day, arr);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [list]);

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/20">
      <div className="flex items-center justify-between">
        <SmallLabel>Bookings</SmallLabel>
        <Pill tone="neutral">{list.length}</Pill>
      </div>

      {byDay.length > 0 ? (
        <div className="mt-2 space-y-2">
          {byDay.slice(0, 7).map(([d, items]) => (
            <div key={d} className="rounded-lg bg-white p-2 text-xs ring-1 ring-inset ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <div className="flex items-center justify-between">
                <div className="font-medium text-zinc-800 dark:text-zinc-200">Day {d}</div>
                <div className="text-zinc-500 dark:text-zinc-500">{items.length} booking(s)</div>
              </div>
              <div className="mt-1 space-y-1">
                {items.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                      {b.nights} night(s) @ {b.pricePerNightCents / Math.pow(10, fractionDigits)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(b.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {byDay.length > 7 ? (
            <div className="text-xs text-zinc-500 dark:text-zinc-500">
              Showing 7 day(s) of {byDay.length}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">No bookings yet.</div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
        <TextInput
          inputMode="numeric"
          placeholder="Day (1-31)"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
        <TextInput
          inputMode="numeric"
          placeholder="Nights"
          value={nights}
          onChange={(e) => setNights(e.target.value)}
        />
        <TextInput
          inputMode="decimal"
          placeholder="Price/night"
          value={ppn}
          onChange={(e) => setPpn(e.target.value)}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              const n = Number(nights);
              if (!Number.isInteger(n) || n < 1) return;
              const priceMinor = parseMoneyToCents(ppn, fractionDigits);
              if (priceMinor === null) return;
              const d = Number(day.trim());
              if (!Number.isInteger(d) || d < 1 || d > 31) return;
              onAdd({ propertyId: property.id, nights: n, pricePerNightCents: priceMinor, day: d });
              setDay("");
              setNights("1");
              setPpn("");
            }}
            disabled={
              parseMoneyToCents(ppn, fractionDigits) === null ||
              !Number.isInteger(Number(day.trim())) ||
              Number(day.trim()) < 1 ||
              Number(day.trim()) > 31
            }
          >
            Add booking
          </Button>
        </div>
      </div>
    </div>
  );
}

function AnalysisPanel({
  data,
  properties,
  moneyOpts,
  period,
  setPeriod,
  propertyId,
  setPropertyId,
}: {
  data: BnbData;
  properties: Property[];
  moneyOpts: { currency: string; locale: string };
  period: Period;
  setPeriod: (p: Period) => void;
  propertyId: string;
  setPropertyId: (id: string) => void;
}) {
  const [comparePeriodKey, setComparePeriodKey] = useState<string>("");

  const rows = useMemo(
    () =>
      buildSummaryRows({
        data,
        properties,
        period,
        propertyId: propertyId === "all" ? undefined : propertyId,
      }),
    [data, properties, period, propertyId],
  );

  const defaultCompareKey = rows.length ? rows[rows.length - 1]!.period : "";
  const effectiveCompareKey =
    comparePeriodKey && rows.some((r) => r.period === comparePeriodKey) ? comparePeriodKey : defaultCompareKey;

  const propertyCompareRows = useMemo(() => {
    if (propertyId !== "all") return [];
    if (!effectiveCompareKey) return [];
    return [...properties]
      .map((p) => {
        const propRows = buildSummaryRows({ data, properties, period, propertyId: p.id });
        const row =
          propRows.find((r) => r.period === effectiveCompareKey) ??
          ({
            period: effectiveCompareKey,
            revenueCents: 0,
            operatingCostCents: 0,
            baseRentCostCents: 0,
            totalCostCents: 0,
            profitCents: 0,
            nights: 0,
          } as const);
        return {
          id: p.id,
          label: p.name,
          a: row.revenueCents,
          b: row.totalCostCents,
          aLabel: "Revenue",
          bLabel: "Cost",
          profitCents: row.profitCents,
        };
      })
      .sort((a, b) => b.profitCents - a.profitCents);
  }, [data, properties, period, propertyId, effectiveCompareKey]);
  const totals = rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenueCents;
      acc.cost += r.totalCostCents;
      acc.profit += r.profitCents;
      acc.nights += r.nights;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, nights: 0 },
  );

  const chartRows = rows.slice(-8).map((r) => ({
    label: r.period,
    a: r.revenueCents,
    b: r.totalCostCents,
    aLabel: "Revenue",
    bLabel: "Cost",
  }));
  const costRows = rows.slice(-8).map((r) => ({
    label: r.period,
    parts: [
      { label: "Base rent", value: r.baseRentCostCents, className: "bg-amber-500/70" },
      { label: "Operating", value: r.operatingCostCents, className: "bg-rose-500/60" },
    ],
  }));
  const nightsRows = rows.slice(-8).map((r) => ({
    label: r.period,
    parts: [{ label: "Nights booked", value: r.nights, className: "bg-sky-500/70" }],
  }));

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Analysis
          </div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Property-level and business-level rollups.
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="grid gap-1">
            <SmallLabel>Period</SmallLabel>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semiannual">Semi annual</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div className="grid gap-1">
            <SmallLabel>Scope</SmallLabel>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="h-10 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="all">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {propertyId === "all" && rows.length > 0 ? (
            <div className="grid gap-1">
              <SmallLabel>Compare period</SmallLabel>
              <select
                value={effectiveCompareKey}
                onChange={(e) => setComparePeriodKey(e.target.value)}
                className="h-10 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                {rows.map((r) => (
                  <option key={r.period} value={r.period}>
                    {r.period}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <MetricCard label="Revenue" value={formatMoney(totals.revenue, moneyOpts)} />
        <MetricCard label="Total cost" value={formatMoney(totals.cost, moneyOpts)} />
        <MetricCard
          label="Profit"
          value={formatMoney(totals.profit, moneyOpts)}
          sub={`${totals.nights} night(s)`}
        />
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Profit trend ({rows.length})
          </div>
          <div className="mt-2">
            <Sparkline values={rows.map((r) => r.profitCents)} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <GroupedBarChart
          title="Revenue vs Cost (last 8 periods)"
          rows={chartRows}
          formatValue={(v) => formatMoney(v, moneyOpts)}
          aColorClass="bg-emerald-500/70"
          bColorClass="bg-rose-500/60"
        />
        <StackedBarChart
          title="Cost breakdown (last 8 periods)"
          rows={costRows}
          formatValue={(v) => formatMoney(v, moneyOpts)}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <StackedBarChart title="Nights booked (last 8 periods)" rows={nightsRows} formatValue={(v) => String(v)} />
      </div>

      {propertyId === "all" && propertyCompareRows.length > 0 ? (
        <div className="mt-3">
          <ScatterChart
            title={`Property performance (X: revenue, Y: cost) — ${effectiveCompareKey}`}
            points={propertyCompareRows.map((r) => ({
              id: r.id,
              label: r.label,
              x: r.a,
              y: r.b,
              profit: r.a - r.b,
            }))}
            formatValue={(v) => formatMoney(v, moneyOpts)}
            xLabel="Revenue"
            yLabel="Cost"
          />
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Period</th>
              <th className="px-3 py-2 text-right font-semibold">Revenue</th>
              <th className="px-3 py-2 text-right font-semibold">Cost</th>
              <th className="px-3 py-2 text-right font-semibold">Profit</th>
              <th className="px-3 py-2 text-right font-semibold">Nights</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400"
                >
                  No data yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.period}>
                  <td className="px-3 py-2">{r.period}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(r.revenueCents, moneyOpts)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(r.totalCostCents, moneyOpts)}</td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={
                        r.profitCents > 0
                          ? "text-emerald-700 dark:text-emerald-300 font-medium"
                          : r.profitCents < 0
                            ? "text-rose-700 dark:text-rose-300 font-medium"
                            : "text-zinc-700 dark:text-zinc-300"
                      }
                    >
                      {formatMoney(r.profitCents, moneyOpts)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{r.nights}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

