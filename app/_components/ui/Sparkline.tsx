"use client";

export function Sparkline({
  values,
  width = 180,
  height = 36,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <path
          d={`M0 ${height / 2} L${width} ${height / 2}`}
          stroke="currentColor"
          opacity="0.2"
          strokeWidth="2"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / span) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const [lastX, lastY] = points[points.length - 1].split(",");

  const tone = values[values.length - 1] - values[0] >= 0 ? "text-emerald-600" : "text-rose-600";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={tone}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(" ")}
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="2.5"
        fill="currentColor"
      />
    </svg>
  );
}

