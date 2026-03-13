"use client";

export type ChartRow = {
  label: string;
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
};

export function GroupedBarChart({
  title,
  rows,
  formatValue,
  aColorClass = "bg-emerald-500/70",
  bColorClass = "bg-rose-500/60",
}: {
  title: string;
  rows: ChartRow[];
  formatValue: (v: number) => string;
  aColorClass?: string;
  bColorClass?: string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]));
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{title}</div>
      <div className="mt-3 grid gap-2">
        {rows.map((r) => {
          const aPct = (r.a / max) * 100;
          const bPct = (r.b / max) * 100;
          return (
            <div
              key={r.label}
              className="grid grid-cols-[72px_1fr] gap-3 items-center sm:grid-cols-[84px_1fr]"
            >
              <div className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {r.label}
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-900">
                    <div
                      className={`h-2 rounded-full ${aColorClass}`}
                      style={{ width: `${Math.max(0, Math.min(100, aPct))}%` }}
                      title={`${r.aLabel}: ${formatValue(r.a)}`}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                    {r.aLabel}: {formatValue(r.a)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-900">
                    <div
                      className={`h-2 rounded-full ${bColorClass}`}
                      style={{ width: `${Math.max(0, Math.min(100, bPct))}%` }}
                      title={`${r.bLabel}: ${formatValue(r.b)}`}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                    {r.bLabel}: {formatValue(r.b)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type StackedRow = {
  label: string;
  parts: { label: string; value: number; className: string }[];
};

export function StackedBarChart({
  title,
  rows,
  formatValue,
}: {
  title: string;
  rows: StackedRow[];
  formatValue: (v: number) => string;
}) {
  const max = Math.max(
    1,
    ...rows.map((r) => r.parts.reduce((s, p) => s + p.value, 0)),
  );
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{title}</div>
      <div className="mt-3 grid gap-2">
        {rows.map((r) => {
          const total = r.parts.reduce((s, p) => s + p.value, 0);
          return (
            <div
              key={r.label}
              className="grid grid-cols-[72px_1fr] gap-3 items-center sm:grid-cols-[84px_1fr]"
            >
              <div className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {r.label}
              </div>
              <div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                  <div className="flex h-3 w-full">
                    {r.parts.map((p) => {
                      const pct = (p.value / max) * 100;
                      return (
                        <div
                          key={p.label}
                          className={p.className}
                          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                          title={`${p.label}: ${formatValue(p.value)}`}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                  Total: {formatValue(total)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
        {rows[0]?.parts.map((p) => (
          <div key={p.label} className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${p.className}`} />
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export type ScatterPoint = {
  id?: string;
  label: string;
  x: number;
  y: number;
  profit?: number;
};

export function ScatterChart({
  title,
  points,
  formatValue,
  xLabel = "Revenue",
  yLabel = "Cost",
}: {
  title: string;
  points: ScatterPoint[];
  formatValue: (v: number) => string;
  xLabel?: string;
  yLabel?: string;
}) {
  const maxX = Math.max(1, ...points.map((p) => p.x));
  const maxY = Math.max(1, ...points.map((p) => p.y));
  const scaleMax = Math.max(maxX, maxY, 1);

  const W = 520;
  const H = 260;
  const P = 42;
  const innerW = W - P * 2;
  const innerH = H - P * 2;
  const ticks = 4;

  const xToSvg = (x: number) => P + (Math.max(0, Math.min(scaleMax, x)) / scaleMax) * innerW;
  const yToSvg = (y: number) =>
    P + innerH - (Math.max(0, Math.min(scaleMax, y)) / scaleMax) * innerH;

  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{title}</div>

      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[220px] w-full min-w-[420px] sm:h-[260px] sm:min-w-[520px]"
          role="img"
          aria-label={title}
        >
          {/* grid */}
          {Array.from({ length: ticks + 1 }).map((_, i) => {
            const t = i / ticks;
            const x = P + t * innerW;
            const y = P + t * innerH;
            const val = Math.round(t * scaleMax);
            return (
              <g key={i}>
                <line x1={x} y1={P} x2={x} y2={P + innerH} className="stroke-zinc-200/70 dark:stroke-zinc-800" />
                <line x1={P} y1={y} x2={P + innerW} y2={y} className="stroke-zinc-200/70 dark:stroke-zinc-800" />
                <text x={x} y={P + innerH + 16} textAnchor="middle" className="fill-zinc-500 text-[10px]">
                  {formatValue(val)}
                </text>
                <text x={P - 6} y={P + innerH - t * innerH + 3} textAnchor="end" className="fill-zinc-500 text-[10px]">
                  {formatValue(val)}
                </text>
              </g>
            );
          })}

          {/* axes */}
          <line x1={P} y1={P + innerH} x2={P + innerW} y2={P + innerH} className="stroke-zinc-400 dark:stroke-zinc-700" />
          <line x1={P} y1={P} x2={P} y2={P + innerH} className="stroke-zinc-400 dark:stroke-zinc-700" />

          {/* breakeven line (revenue = cost) */}
          <line
            x1={xToSvg(0)}
            y1={yToSvg(0)}
            x2={xToSvg(scaleMax)}
            y2={yToSvg(scaleMax)}
            className="stroke-zinc-400/70 dark:stroke-zinc-600"
            strokeDasharray="4 4"
          />
          <text x={xToSvg(scaleMax)} y={yToSvg(scaleMax) - 6} textAnchor="end" className="fill-zinc-500 text-[10px]">
            breakeven
          </text>

          {/* axis labels */}
          <text x={P + innerW} y={H - 8} textAnchor="end" className="fill-zinc-600 dark:fill-zinc-400 text-[11px]">
            {xLabel} →
          </text>
          <text
            x={12}
            y={P}
            textAnchor="start"
            className="fill-zinc-600 dark:fill-zinc-400 text-[11px]"
          >
            ↑ {yLabel}
          </text>

          {/* points */}
          {points.map((p) => {
            const cx = xToSvg(p.x);
            const cy = yToSvg(p.y);
            const good = p.profit !== undefined ? p.profit > 0 : p.x > p.y;
            const cls = good ? "fill-emerald-500" : "fill-rose-500";
            return (
              <g key={p.id ?? p.label}>
                <circle cx={cx} cy={cy} r={5} className={cls}>
                  <title>
                    {p.label}
                    {"\n"}
                    Revenue: {formatValue(p.x)}
                    {"\n"}
                    Cost: {formatValue(p.y)}
                    {p.profit !== undefined ? `\nProfit: ${formatValue(p.profit)}` : ""}
                  </title>
                </circle>
                <text x={cx + 8} y={cy + 3} className="fill-zinc-700 dark:fill-zinc-300 text-[10px]">
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
        <div className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Profitable (revenue &gt; cost)
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Loss (revenue &lt; cost)
        </div>
      </div>
    </div>
  );
}

