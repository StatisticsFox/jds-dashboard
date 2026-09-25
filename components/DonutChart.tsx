"use client";

import { useState } from "react";

export type Slice = { label: string; value: number; color: string };

// 도넛(가운데 뚫린 원그래프) + 순위 목록.
// 조각이나 목록에 마우스를 올리면 둘 다 함께 강조되고, 가운데에 그 항목의 개수·비율이 보임
export function DonutChart({ slices, unit = "명", size = 260 }: { slices: Slice[]; unit?: string; size?: number }) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((s, d) => s + d.value, 0);
  const shown = slices.filter((d) => d.value > 0);
  const ranked = slices.filter((d) => d.value > 0).sort((a, b) => b.value - a.value); // 0명은 목록에서 숨김
  const pct = (v: number) => (total ? (v / total) * 100 : 0);
  const current = shown.find((d) => d.label === active);

  const R = size / 2;
  const r0 = R * 0.6;
  let angle = -Math.PI / 2; // 12시 방향부터 시계 방향

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} onPointerLeave={() => setActive(null)}>
          {shown.length === 1 ? (
            <circle cx={R} cy={R} r={(R + r0) / 2} fill="none" stroke={shown[0].color} strokeWidth={R - r0} onPointerEnter={() => setActive(shown[0].label)} />
          ) : (
            shown.map((d) => {
              const start = angle;
              angle += (d.value / total) * Math.PI * 2;
              const dim = active !== null && active !== d.label;
              return (
                <path
                  key={d.label}
                  d={arc(R, R, active === d.label ? R : R - 4, r0, start, angle)}
                  fill={d.color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  opacity={dim ? 0.35 : 1}
                  className="cursor-pointer transition-opacity"
                  onPointerEnter={() => setActive(d.label)}
                />
              );
            })
          )}
        </svg>
        {/* 가운데 글자 */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {current ? (
            <>
              <span className="max-w-[60%] truncate text-xs text-muted">{current.label}</span>
              <span className="font-cute text-3xl">{pct(current.value).toFixed(1)}%</span>
              <span className="text-xs text-muted">
                {current.value.toLocaleString()}
                {unit}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted">전체</span>
              <span className="font-cute text-4xl">{total.toLocaleString()}</span>
              <span className="text-xs text-muted">{unit}</span>
            </>
          )}
        </div>
      </div>

      {/* 순위 목록: 비율이 비슷한 조각도 정확히 비교할 수 있게 */}
      <ol className="w-full max-w-sm space-y-1 text-sm tabular-nums" onPointerLeave={() => setActive(null)}>
        {ranked.map((d, i) => (
          <li
            key={d.label}
            onPointerEnter={() => setActive(d.label)}
            className={`grid cursor-default grid-cols-[1.25rem_1fr_3.5rem_3.5rem] items-center gap-2 rounded-xl px-2 py-1.5 transition-colors ${
              active === d.label ? "bg-accent-soft" : ""
            } ${active !== null && active !== d.label ? "opacity-50" : ""}`}
          >
            <span className="text-xs text-muted">{i + 1}</span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="text-right text-muted">
              {d.value.toLocaleString()}
              {unit}
            </span>
            <span className="text-right font-semibold">{pct(d.value).toFixed(1)}%</span>
            {/* 비율 막대 */}
            <span className="col-span-4 col-start-1 ml-6 h-1.5 overflow-hidden rounded-full bg-grid">
              <span className="block h-full rounded-full" style={{ width: `${pct(d.value)}%`, background: d.color }} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// 도넛 조각 경로 (바깥 반지름 R, 안쪽 반지름 r, 각도 a0→a1)
function arc(cx: number, cy: number, R: number, r: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (rad: number, a: number) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
  return `M${p(R, a0)} A${R},${R} 0 ${large} 1 ${p(R, a1)} L${p(r, a1)} A${r},${r} 0 ${large} 0 ${p(r, a0)} Z`;
}
