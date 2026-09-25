"use client";

import { useEffect, useRef, useState } from "react";

// deltas: 그 지점에서 새로 늘어난 값 (누적 그래프일 때 툴팁에 "+N"으로 표시, 선택)
export type LineSeries = { id: string; label: string; color: string; values: (number | null)[]; deltas?: (number | null)[] };

type Props = {
  xLabels: string[]; // 가로축 (예: "10주차", "9주차" …)
  series: LineSeries[];
  unit?: string;
  height?: number;
};

const PAD = { top: 16, right: 76, bottom: 30, left: 44 };

// 여러 개강의 추이를 겹쳐 그리는 선 그래프
// 마우스를 올리면 세로 기준선과 함께 그 주차의 모든 개강 값을 보여줌
export function LineChart({ xLabels, series, unit = "개", height = 320 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  // 카드 폭에 맞춰 다시 그림
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const step = niceStep(Math.max(1, ...all) / 4);
  const top = Math.ceil((Math.max(1, ...all) * 1.05) / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => step * i);
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (xLabels.length <= 1 ? innerW / 2 : (innerW * i) / (xLabels.length - 1));
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

  // null(해당 주차 없음)에서 선을 끊어서 그림
  const path = (values: (number | null)[]) =>
    values.reduce((d, v, i) => (v === null ? d : `${d}${i === 0 || values[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`), "");

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const step = xLabels.length <= 1 ? innerW : innerW / (xLabels.length - 1);
    setHover(Math.min(xLabels.length - 1, Math.max(0, Math.round((px - PAD.left) / step))));
  }

  // 선 끝 이름표: 4개 이하일 때만, 겹치지 않게 세로로 벌림
  const endLabels =
    series.length <= 4
      ? spread(
          series
            .map((s) => {
              const last = s.values.findLastIndex((v) => v !== null);
              return last < 0 ? null : { s, i: last, y: y(s.values[last]!) };
            })
            .filter((l) => l !== null),
          16,
        )
      : [];

  const tip = hover === null ? null : series.map((s) => ({ s, v: s.values[hover], d: s.deltas?.[hover] })).sort((a, b) => (b.v ?? -1) - (a.v ?? -1));

  return (
    <div ref={box} className="relative w-full">
      <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-none select-none">
        {/* 가로 눈금선 */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
              {t.toLocaleString()}
            </text>
          </g>
        ))}
        {/* 가로축 */}
        {xLabels.map((l, i) => (
          <text key={l} x={x(i)} y={height - 8} textAnchor="middle" className={`text-[11px] ${hover === i ? "fill-foreground font-semibold" : "fill-muted"}`}>
            {l}
          </text>
        ))}
        {/* 마우스 위치 기준선 */}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--muted)" strokeDasharray="0" strokeOpacity={0.35} />}
        {/* 선과 점 */}
        {series.map((s) => (
          <g key={s.id}>
            <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) =>
              v === null ? null : (
                <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5.5 : 4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ),
            )}
          </g>
        ))}
        {/* 선 끝 이름표 (글자는 본문 색, 옆 짧은 선이 개강 색) */}
        {endLabels.map(({ s, i, y: ly }) => (
          <g key={s.id}>
            <line x1={x(i) + 8} x2={x(i) + 16} y1={ly} y2={ly} stroke={s.color} strokeWidth={2} strokeLinecap="round" />
            <text x={x(i) + 20} y={ly} dy="0.32em" className="fill-foreground text-[11px] font-medium">
              {s.label}
            </text>
          </g>
        ))}
      </svg>

      {/* 마우스를 올린 주차의 값 */}
      {tip && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg"
          style={x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}
        >
          <div className="mb-1 font-semibold">{xLabels[hover]}</div>
          {tip.map(({ s, v, d }) => (
            <div key={s.id} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="tabular-nums">
                <span className="font-semibold">{v === null ? "–" : `${v.toLocaleString()}${unit}`}</span>
                {d != null && <span className="ml-1 text-muted">(+{d.toLocaleString()})</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 눈금 간격을 1·2·5 × 10^n 중 하나로 (정수로 딱 떨어지게)
function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  return Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((m) => m >= raw) ?? raw);
}

// 이름표가 겹치지 않도록 최소 간격(gap)만큼 위아래로 벌림
function spread<T extends { y: number }>(items: T[], gap: number): T[] {
  const sorted = [...items].sort((a, b) => a.y - b.y).map((it) => ({ ...it }));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < gap) sorted[i].y = sorted[i - 1].y + gap;
  }
  return sorted;
}
