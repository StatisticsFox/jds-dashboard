import type { Count } from "@/lib/metrics";

// 세로 막대 차트 (월별 추이). 막대에 마우스를 올리면 값이 보임
export function ColumnChart({ data }: { data: Count[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const ticks = niceTicks(max);
  const top = ticks.at(-1)!;

  return (
    <div className="flex gap-2">
      {/* y축 눈금 */}
      <div className="relative h-56 w-10 shrink-0 text-right text-xs tabular-nums text-muted">
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `calc(${(t / top) * 100}% - 0.5rem)` }}>
            {t.toLocaleString()}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="relative h-56" style={{ minWidth: data.length * 36 }}>
          {/* 가로 눈금선 */}
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-grid" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5">
            {data.map((d) => (
              <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center">
                <div
                  className="w-full max-w-6 rounded-t-full bg-series-1 transition-opacity group-hover:opacity-80"
                  style={{ height: `${(d.count / top) * 100}%` }}
                />
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-xl border border-border bg-surface px-2.5 py-1 text-xs shadow group-hover:block">
                  <div className="text-muted">{d.label.replace("-", "년 ")}월</div>
                  <div className="font-semibold">{d.count.toLocaleString()}개</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* x축 라벨 */}
        <div className="mt-1 flex gap-0.5 text-xs text-muted" style={{ minWidth: data.length * 36 }}>
          {data.map((d, i) => (
            <div key={d.label} className="flex-1 text-center">
              {i === 0 || d.label.endsWith("-01") ? d.label.replace("-", ".") : d.label.slice(5)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 0부터 max 이상까지 깔끔한 간격(1, 2, 5 × 10^n)의 눈금 4~6개
function niceTicks(max: number) {
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((s) => s * pow).find((s) => s >= raw)!;
  const ticks = [];
  for (let t = 0; t < max + step; t += step) ticks.push(t);
  return ticks;
}
