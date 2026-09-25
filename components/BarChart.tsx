import type { Count } from "@/lib/metrics";

// 가로 막대 차트 (팀별 비교). 막대 끝에 값과 비율을 표시
export function BarChart({ data }: { data: Count[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-14 shrink-0 text-muted">{d.label}</span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="h-5 rounded-r bg-series-1" style={{ width: `${(d.count / max) * 85}%` }} />
            <span className="whitespace-nowrap tabular-nums">
              <span className="font-semibold">{d.count.toLocaleString()}</span>
              <span className="ml-1 text-muted">({total ? Math.round((d.count / total) * 100) : 0}%)</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
