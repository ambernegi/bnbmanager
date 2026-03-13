import type { MonthEntry } from "@/lib/bnb/types";
import { formatMoney, getMonthTotals } from "@/lib/bnb/utils";

function csvEscape(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function excelSafeCell(value: string): string {
  // Protect against CSV/Excel formula injection (cells starting with = + - @).
  // Even though this app is local-first, exporting a spreadsheet is a common attack surface.
  // Prefix with a single quote to force Excel to treat it as a literal string.
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function row(cols: string[]): string {
  return cols.map((c) => csvEscape(excelSafeCell(c))).join(",");
}

export function monthToCsv(
  month: MonthEntry,
  opts?: { currency?: string; locale?: string },
): string {
  const totals = getMonthTotals(month);

  const lines: string[] = [];
  lines.push(row(["Month", month.month]));
  lines.push(row(["Income", formatMoney(totals.incomeCents, opts)]));
  lines.push(row(["Total Expenses", formatMoney(totals.expensesCents, opts)]));
  lines.push(row(["Profit/Loss", formatMoney(totals.profitCents, opts)]));
  lines.push(""); // blank line
  lines.push(row(["Day", "Description", "Amount"]));

  const expenses = [...month.expenses].sort((a, b) => (a.day ?? 999) - (b.day ?? 999));
  for (const ex of expenses) {
    lines.push(
      row([
        ex.day !== undefined ? String(ex.day) : "",
        ex.description,
        formatMoney(ex.amountCents, opts),
      ]),
    );
  }

  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

