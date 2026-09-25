// 탈락 사유 순위 막대 (한 가지 색). 막대 길이 = 인원, 오른쪽에 인원과 탈락 중 비율
export function ReasonBars({ rows }: { rows: { label: string; count: number }[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const sorted = [...rows].filter((r) => r.count > 0).sort((a, b) => b.count - a.count);

  return (
    <ol className="space-y-1.5 text-sm tabular-nums">
      {sorted.map((r, i) => (
        // 넓은 화면: 한 줄(순위·사유·막대·개수·비율), 좁은 화면: 막대를 아래 줄에 넓게
        <li
          key={r.label}
          className="group grid grid-cols-[1.25rem_1fr_3.5rem_3.25rem] items-center gap-x-2 gap-y-1 rounded-xl px-2 py-1 hover:bg-accent-soft/60 sm:grid-cols-[1.25rem_10rem_1fr_4rem_3.5rem]"
        >
          <span className="text-xs text-muted">{i + 1}</span>
          <span className="truncate" title={r.label}>
            {r.label}
          </span>
          <span className="order-last col-span-3 col-start-2 h-3 sm:order-none sm:col-span-1 sm:col-start-auto sm:h-5">
            <span className="block h-full rounded-r-full bg-series-1 transition-opacity group-hover:opacity-80" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="text-right text-muted">{r.count.toLocaleString()}명</span>
          <span className="text-right font-semibold">{total ? ((r.count / total) * 100).toFixed(1) : "0.0"}%</span>
        </li>
      ))}
    </ol>
  );
}
