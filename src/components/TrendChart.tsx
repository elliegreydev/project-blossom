"use client";

// A small, dependency-free line/band chart - hand-drawn SVG, matching this
// project's own house style (the Live Pitch View's canvas trail, the PDF
// export's hand-drawn petals) rather than pulling in a charting library.
// Deliberately minimal: no target lines, no colour-coded "good/bad" zones,
// no trend-direction labels - just the shape of the numbers, left for the
// person looking at it to read however they want.

interface LinePoint {
  date: string;
  value: number;
}

interface BandPoint {
  date: string;
  low: number;
  high: number;
}

const WIDTH = 300;
const PAD_X = 8;
const PAD_Y = 10;

function fmtAxisDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function TrendChart({
  points,
  band,
  min,
  max,
  height = 90,
  color = "var(--lavender)",
}: {
  points?: LinePoint[];
  band?: BandPoint[];
  min?: number;
  max?: number;
  height?: number;
  color?: string;
}) {
  const series = points ?? band;
  if (!series || series.length < 2) return null;

  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const values = band
    ? (sorted as BandPoint[]).flatMap((p) => [p.low, p.high])
    : (sorted as LinePoint[]).map((p) => p.value);
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const range = hi - lo || 1;

  const toXY = (i: number, v: number): [number, number] => {
    const x = PAD_X + (i / (sorted.length - 1)) * (WIDTH - PAD_X * 2);
    const y = PAD_Y + (1 - (v - lo) / range) * (height - PAD_Y * 2);
    return [x, y];
  };

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} width="100%" height={height} role="img" aria-label="Trend over time">
        {band ? (
          <>
            {(() => {
              const bandSorted = sorted as BandPoint[];
              const top = bandSorted.map((p, i) => toXY(i, p.high));
              const bottom = bandSorted.map((p, i) => toXY(i, p.low)).reverse();
              const areaD = [...top, ...bottom].map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
              return <path d={areaD} fill={color} opacity={0.22} stroke="none" />;
            })()}
          </>
        ) : (
          <>
            <path
              d={(sorted as LinePoint[])
                .map((p, i) => {
                  const [x, y] = toXY(i, p.value);
                  return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {(sorted as LinePoint[]).map((p, i) => {
              const [x, y] = toXY(i, p.value);
              return <circle key={i} cx={x} cy={y} r={2.5} fill={color} />;
            })}
          </>
        )}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
        <span>{fmtAxisDate(sorted[0].date)}</span>
        <span>{fmtAxisDate(sorted[sorted.length - 1].date)}</span>
      </div>
    </div>
  );
}
