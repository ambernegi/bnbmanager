"use client";

export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-zinc-200/50 blur-2xl dark:bg-zinc-700/20" />
      </div>
      <div className="relative">
        <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</div>
        <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {value}
        </div>
        {sub ? (
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}

