import Link from "next/link";
import type { WeekDrops } from "@/lib/drops";

type Row = { key: string; label: string; href: object; active: boolean; data: WeekDrops };

// 주차 × 탈락 사유 히트맵 표. 칸 = 그 주차 탈락 중 이 사유의 비율, 비율이 높을수록 진한 색(한 가지 색)
// 주차 이름을 누르면 위 순위 막대가 그 주차로 바뀜
export function ReasonHeatmap({
  reasons,
  rows,
  rowLabel = "주차",
  rateLabel = "탈락률",
  unit = "찾기",
}: {
  reasons: string[];
  rows: Row[];
  rowLabel?: string;
  rateLabel?: string;
  unit?: string;
}) {
  const share = (d: WeekDrops, r: string) => {
    const dropped = [...d.reasons.values()].reduce((a, b) => a + b, 0);
    return dropped ? (d.reasons.get(r) ?? 0) / dropped : 0;
  };
  const maxShare = Math.max(0.0001, ...rows.flatMap((row) => reasons.map((r) => share(row.data, r))));

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-max border-separate border-spacing-0.5 text-xs tabular-nums">
        <thead>
          <tr className="text-muted">
            <th className="sticky left-0 z-10 bg-surface px-2 py-2 text-left font-medium">{rowLabel}</th>
            <th className="px-2 py-2 text-right font-medium">{rateLabel}</th>
            {reasons.map((r) => (
              <th key={r} className="min-w-12 max-w-24 break-keep px-1.5 py-2 text-center align-bottom font-medium leading-tight" title={r}>
                {r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const dropped = [...row.data.reasons.values()].reduce((a, b) => a + b, 0);
            return (
              <tr key={row.key} className={row.active ? "outline-2 -outline-offset-1 outline-accent" : ""}>
                <th className={`sticky left-0 z-10 bg-surface px-2 py-1.5 text-left ${row.key === "all" ? "border-t border-border" : ""}`}>
                  <Link href={row.href} scroll={false} className={`rounded-md px-1 hover:underline ${row.active ? "font-semibold text-accent-strong" : "font-medium"}`}>
                    {row.label}
                  </Link>
                </th>
                <td className="px-2 py-1.5 text-right text-muted" title={`${unit} ${row.data.finds}명 중 탈락 ${dropped}명`}>
                  {row.data.finds ? `${Math.round((dropped / row.data.finds) * 100)}%` : "–"}
                </td>
                {reasons.map((r) => {
                  const s = share(row.data, r);
                  const n = row.data.reasons.get(r) ?? 0;
                  return (
                    <td
                      key={r}
                      className="rounded-md px-1.5 py-1.5 text-center"
                      style={{ background: n ? `color-mix(in oklab, var(--series-1) ${Math.round(8 + (s / maxShare) * 62)}%, var(--surface))` : undefined }}
                      title={`${row.label} · ${r}: ${n}명 (${(s * 100).toFixed(1)}%)`}
                    >
                      {/* 진한 칸은 짙은 글씨로 (다크 모드의 밝은 민트 위에서도 읽히게) */}
                      {n ? (
                        <span className={s / maxShare > 0.45 ? "font-semibold text-accent-ink" : ""}>{s < 0.005 ? "<1" : Math.round(s * 100)}%</span>
                      ) : (
                        <span className="text-muted/40">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
