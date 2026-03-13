"use client";

import { useMemo } from "react";

export function MoneyDrum({
  rentMinor,
  operatingCostMinor,
  scaleMaxMinor,
  label,
  variant = "rented",
}: {
  rentMinor: number;
  operatingCostMinor: number;
  scaleMaxMinor: number;
  label?: string;
  variant?: "owned" | "rented";
}) {
  const { fillPct, costPctOfFill } = useMemo(() => {
    const max = Math.max(1, scaleMaxMinor);
    const fill = Math.max(0, Math.min(1, rentMinor / max));
    const costOfRent = rentMinor > 0 ? Math.max(0, Math.min(1, operatingCostMinor / rentMinor)) : 0;
    return { fillPct: fill * 100, costPctOfFill: costOfRent * 100 };
  }, [rentMinor, operatingCostMinor, scaleMaxMinor]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-20 w-12 overflow-hidden rounded-[18px] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {/* glass highlight */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/40 to-transparent dark:from-white/10" />
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/35 to-transparent dark:from-white/10" />
        </div>

        {/* fill */}
        <div
          className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
          style={{ height: `${fillPct}%` }}
        >
          {/* money texture */}
          <div
            className={
              variant === "owned"
                ? "absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,.22),rgba(99,102,241,.12))] dark:bg-[linear-gradient(135deg,rgba(59,130,246,.18),rgba(99,102,241,.08))]"
                : "absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,.22),rgba(34,197,94,.12))] dark:bg-[linear-gradient(135deg,rgba(16,185,129,.18),rgba(34,197,94,.08))]"
            }
          />
          <div className="absolute inset-0 opacity-50 mix-blend-multiply dark:mix-blend-screen">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(0,0,0,.08),rgba(0,0,0,.08)_2px,transparent_2px,transparent_10px)] dark:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.08),rgba(255,255,255,.08)_2px,transparent_2px,transparent_10px)]" />
          </div>

          {/* operating cost portion */}
          <div
            className={
              variant === "owned"
                ? "absolute inset-x-0 bottom-0 bg-amber-500/35 transition-[height] duration-700 ease-out dark:bg-amber-500/25"
                : "absolute inset-x-0 bottom-0 bg-rose-500/35 transition-[height] duration-700 ease-out dark:bg-rose-500/25"
            }
            style={{ height: `${costPctOfFill}%` }}
          />
        </div>

        {/* rim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-zinc-100 dark:bg-zinc-900" />
      </div>

      {label ? (
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {label}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            {variant === "owned"
              ? "Blue = owned rent, amber = operating cost"
              : "Green = rent, red = operating cost"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

