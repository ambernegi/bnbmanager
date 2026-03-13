"use client";

import { useMemo } from "react";

export function MoneyDrum({
  revenueMinor,
  totalCostMinor,
  baseRentMinor,
  operatingCostMinor,
  scaleMaxMinor,
  label,
  variant = "rented",
}: {
  revenueMinor: number;
  totalCostMinor: number;
  baseRentMinor: number;
  operatingCostMinor: number;
  scaleMaxMinor: number;
  label?: string;
  variant?: "owned" | "rented";
}) {
  const { revenuePct, costPct, basePct, opPct, isProfitable } = useMemo(() => {
    const max = Math.max(1, scaleMaxMinor);
    const revenue = Math.max(0, Math.min(1, revenueMinor / max));
    const cost = Math.max(0, Math.min(1, totalCostMinor / max));
    const base = Math.max(0, Math.min(1, baseRentMinor / max));
    const op = Math.max(0, Math.min(1, operatingCostMinor / max));
    return {
      revenuePct: revenue * 100,
      costPct: cost * 100,
      basePct: base * 100,
      opPct: op * 100,
      isProfitable: revenueMinor > totalCostMinor && totalCostMinor > 0,
    };
  }, [revenueMinor, totalCostMinor, baseRentMinor, operatingCostMinor, scaleMaxMinor]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-20 w-12 overflow-hidden rounded-[18px] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {/* glass highlight */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/40 to-transparent dark:from-white/10" />
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/35 to-transparent dark:from-white/10" />
        </div>

        {/* cost stack (background) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <div
            className="absolute inset-x-0 bottom-0 bg-zinc-200/40 dark:bg-zinc-800/40"
            style={{ height: `${costPct}%` }}
          />
          <div
            className="absolute inset-x-0 bottom-0 bg-amber-500/22 dark:bg-amber-500/16"
            style={{ height: `${basePct}%` }}
            title="Base rent cost"
          />
          <div
            className="absolute inset-x-0 bottom-0 bg-rose-500/22 dark:bg-rose-500/16"
            style={{ height: `${opPct}%` }}
            title="Operating cost"
          />
          {/* breakeven marker */}
          <div
            className="absolute inset-x-0 border-t border-dashed border-zinc-400/60 dark:border-zinc-600/60"
            style={{ bottom: `${costPct}%` }}
          />
        </div>

        {/* revenue fill (foreground) */}
        <div
          className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
          style={{ height: `${revenuePct}%` }}
        >
          <div
            className={
              variant === "owned"
                ? "absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,.26),rgba(99,102,241,.14))] dark:bg-[linear-gradient(135deg,rgba(59,130,246,.20),rgba(99,102,241,.10))]"
                : "absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,.26),rgba(34,197,94,.14))] dark:bg-[linear-gradient(135deg,rgba(16,185,129,.20),rgba(34,197,94,.10))]"
            }
          />
          <div className="absolute inset-0 opacity-50 mix-blend-multiply dark:mix-blend-screen">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(0,0,0,.08),rgba(0,0,0,.08)_2px,transparent_2px,transparent_10px)] dark:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.08),rgba(255,255,255,.08)_2px,transparent_2px,transparent_10px)]" />
          </div>
        </div>

        {isProfitable ? (
          <div className="pointer-events-none absolute inset-x-0 top-1 flex justify-center">
            <div className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
              Profit
            </div>
          </div>
        ) : null}

        {/* rim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-zinc-100 dark:bg-zinc-900" />
      </div>

      {label ? (
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {label}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            Revenue fills up to costs (breakeven line).
          </div>
        </div>
      ) : null}
    </div>
  );
}

