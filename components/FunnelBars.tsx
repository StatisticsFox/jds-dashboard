import { formatCount } from "@/lib/format";

export type FunnelStep = { label: string; value: number | null; color: string };

// 단계별 인원 막대 (왼쪽 → 오른쪽 진행 순서) + 막대 사이에 다음 단계로 넘어간 비율
// 막대 높이는 가장 큰 값 기준. 값이 없으면(집계 전) 빈 막대와 "–"
export function FunnelBars({ steps, height = 240 }: { steps: FunnelStep[]; height?: number }) {
  const max = Math.max(1, ...steps.map((s) => s.value ?? 0));
  const rate = (a: number | null, b: number | null) => (a && b !== null ? `${((b / a) * 100).toFixed(1)}%` : "–");

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <div className="flex min-w-[560px] items-end gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="contents">
            {i > 0 && (
              <div className="flex w-14 shrink-0 flex-col items-center justify-end pb-9 text-center" style={{ height: height + 40 }}>
                <span className="text-[11px] text-muted">→</span>
                <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-strong tabular-nums">{rate(steps[i - 1].value, s.value)}</span>
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <span className="mb-1 text-sm font-semibold tabular-nums">{s.value === null ? "–" : `${formatCount(s.value)}명`}</span>
              <div className="flex w-full items-end justify-center" style={{ height }}>
                <div
                  className={`w-full max-w-20 rounded-t-md ${s.value === null ? "border border-dashed border-border" : ""}`}
                  style={{
                    height: s.value === null ? "100%" : `max(${(s.value / max) * 100}%, 3px)`,
                    background: s.value === null ? "transparent" : s.color,
                  }}
                />
              </div>
              <span className="mt-2 h-7 text-center text-xs font-medium leading-tight">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
