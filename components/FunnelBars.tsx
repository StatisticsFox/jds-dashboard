import { formatCount } from "@/lib/format";

// unit: 숫자 뒤 단위 (기본 "명"). 0.5 단위로 세는 단계(따기 등)는 "" 로 숫자만
export type FunnelStep = { label: string; value: number | null; color: string; unit?: string };

// 막대 칸 : 사이 칸 너비 비율 (사이 칸에는 다음 단계로 넘어간 비율을 작게)
const GAP = 0.45;

// 단계별 인원 막대 (왼쪽 → 오른쪽 진행 순서) + 막대 위 가운데를 잇는 선 + 숫자 줄 사이에 다음 단계 비율
// 막대 높이는 가장 큰 값 기준. 값이 없으면(집계 전) 점선 빈 막대와 "–", 선도 거기서 끊김
export function FunnelBars({ steps, height = 240 }: { steps: FunnelStep[]; height?: number }) {
  const max = Math.max(1, ...steps.map((s) => s.value ?? 0));
  const rate = (a: number | null, b: number | null) => (a && b !== null ? `${((b / a) * 100).toFixed(1)}%` : "–");
  const n = steps.length;

  // 각 막대 가운데의 가로 위치(%)와 막대 윗면의 세로 위치(위에서부터 %)
  const units = n + (n - 1) * GAP;
  const x = (i: number) => ((i * (1 + GAP) + 0.5) / units) * 100;
  const top = (v: number) => 100 - (v / max) * 100;
  // 값이 이어지는 구간끼리 선으로 (집계 전 단계에서 끊음)
  const segments: { i: number; v: number }[][] = [];
  steps.forEach((s, i) => {
    if (s.value === null) return;
    const last = segments.at(-1);
    if (last && last.at(-1)!.i === i - 1) last.push({ i, v: s.value });
    else segments.push([{ i, v: s.value }]);
  });
  const columns = steps.flatMap((_, i) => (i ? [`${GAP}fr`, "1fr"] : ["1fr"])).join(" ");

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <div className="min-w-[520px]">
        {/* 막대 위 숫자 · 사이에는 다음 단계로 넘어간 비율 (아래쪽은 선과 겹쳐서 위에 둠) */}
        <div className="grid items-center" style={{ gridTemplateColumns: columns }}>
          {steps.map((s, i) => (
            <div key={s.label} className="contents">
              {i > 0 && (
                <span className="justify-self-center whitespace-nowrap rounded bg-accent-soft px-1 py-px text-[10px] font-semibold text-accent-strong tabular-nums">
                  → {rate(steps[i - 1].value, s.value)}
                </span>
              )}
              <span className="text-center text-sm font-semibold tabular-nums">{s.value === null ? "–" : `${formatCount(s.value)}${s.unit ?? "명"}`}</span>
            </div>
          ))}
        </div>

        {/* 막대 + 선 */}
        <div className="relative mt-3" style={{ height }}>
          <div className="grid h-full items-end" style={{ gridTemplateColumns: columns }}>
            {steps.map((s, i) => (
              <div key={s.label} className="contents">
                {i > 0 && <span />}
                <div
                  className={`rounded-t-md ${s.value === null ? "h-full border border-dashed border-border" : ""}`}
                  style={s.value === null ? undefined : { height: `max(${(s.value / max) * 100}%, 3px)`, background: s.color }}
                />
              </div>
            ))}
          </div>
          {/* 선: 가로·세로 %로 그리고 선 굵기는 늘어나지 않게 */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {segments.map((seg) => (
              <polyline
                key={seg[0].i}
                points={seg.map((p) => `${x(p.i)},${top(p.v)}`).join(" ")}
                fill="none"
                stroke="var(--foreground)"
                strokeOpacity={0.55}
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {/* 점: 원이 찌그러지지 않게 HTML로 */}
          {steps.map((s, i) =>
            s.value === null ? null : (
              <span
                key={s.label}
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-sm"
                style={{ left: `${x(i)}%`, top: `${top(s.value)}%`, background: s.color }}
              />
            ),
          )}
        </div>

        {/* 단계 이름 */}
        <div className="mt-2 grid" style={{ gridTemplateColumns: columns }}>
          {steps.map((s, i) => (
            <div key={s.label} className="contents">
              {i > 0 && <span />}
              <span className="text-center text-xs font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
