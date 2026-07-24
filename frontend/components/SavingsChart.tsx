"use client";

import type { SavingsYearPoint } from "@/lib/compound-savings";

type SavingsChartProps = {
  series: SavingsYearPoint[];
  contributionsLabel: string;
  interestLabel: string;
};

const WIDTH = 560;
const HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 32, left: 64 };

function formatAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    const rounded =
      Math.abs(millions) >= 10
        ? Math.round(millions)
        : Math.round(millions * 10) / 10;
    return `${String(rounded).replace(".", ",")} M€`;
  }
  if (abs >= 1000) {
    return `${Math.round(value / 1000)} k€`;
  }
  return `${Math.round(value)} €`;
}

export function SavingsChart({
  series,
  contributionsLabel,
  interestLabel,
}: SavingsChartProps) {
  if (series.length === 0) {
    return null;
  }

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const maxY = Math.max(...series.map((p) => p.total), 1);
  const n = series.length;

  function xAt(i: number) {
    if (n === 1) {
      return PAD.left + innerW / 2;
    }
    return PAD.left + (i / (n - 1)) * innerW;
  }

  function yAt(value: number) {
    return PAD.top + innerH * (1 - Math.min(value, maxY) / maxY);
  }

  /** Closed path between lowerY(p) and upperY(p) along the series. */
  function bandPath(
    lowerY: (p: SavingsYearPoint) => number,
    upperY: (p: SavingsYearPoint) => number,
  ) {
    if (n === 1) {
      const x = xAt(0);
      const yLow = lowerY(series[0]);
      const yUp = upperY(series[0]);
      return `M ${x - 10} ${yLow} L ${x - 10} ${yUp} L ${x + 10} ${yUp} L ${x + 10} ${yLow} Z`;
    }

    const top = series
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${upperY(p)}`)
      .join(" ");
    const bottom = [...series]
      .reverse()
      .map((p, i) => `L ${xAt(n - 1 - i)} ${lowerY(p)}`)
      .join(" ");
    return `${top} ${bottom} Z`;
  }

  const tickCount = Math.min(5, n);
  const xTicks = Array.from({ length: tickCount }, (_, i) => {
    const idx =
      tickCount === 1 ? 0 : Math.round((i / (tickCount - 1)) * (n - 1));
    return { idx, year: series[idx].year };
  });

  const yTicks = [0, 0.5, 1].map((ratio) => ({
    value: maxY * ratio,
    y: yAt(maxY * ratio),
  }));

  return (
    <div className="mt-4 overflow-visible">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`${contributionsLabel}, ${interestLabel}`}
      >
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.12}
            />
            <text
              x={PAD.left - 8}
              y={tick.y + 3}
              textAnchor="end"
              className="fill-card-subtle"
              fontSize={10}
            >
              {formatAxisValue(tick.value)}
            </text>
          </g>
        ))}

        <path
          d={bandPath(
            () => yAt(0),
            (p) => yAt(p.contributions),
          )}
          className="fill-border-strong"
        />
        <path
          d={bandPath(
            (p) => yAt(p.contributions),
            (p) => yAt(p.total),
          )}
          className="fill-primary"
          opacity={0.65}
        />

        {xTicks.map((tick) => (
          <text
            key={`${tick.idx}-${tick.year}`}
            x={xAt(tick.idx)}
            y={HEIGHT - 10}
            textAnchor="middle"
            className="fill-card-subtle"
            fontSize={10}
          >
            {tick.year}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-border-strong" />
          {contributionsLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/65" />
          {interestLabel}
        </span>
      </div>
    </div>
  );
}
