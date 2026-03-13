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
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-rose-200/40 blur-2xl dark:bg-rose-500/10" />
      </div>
      <div className="relative">
        <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {value}
        </div>
        {sub ? (
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}

