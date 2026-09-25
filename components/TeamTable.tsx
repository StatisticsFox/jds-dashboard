import { COUNT_METRICS, RATE_METRICS, type Counts, type Summary, type TeamResult } from "@/lib/conversion";
import { formatCount, formatCountDiff, formatRate, formatRateDiff } from "@/lib/format";

// 차이의 크기(기준값 대비 비율)에 따라 칸 배경을 3단계로 칠함. 높으면 초록, 낮으면 빨강
function tint(diff: number, base: number) {
  const ratio = base ? Math.abs(diff / base) : 0;
  const level = ratio < 0.05 ? 0 : ratio < 0.15 ? 12 : ratio < 0.3 ? 22 : 34;
  if (!level) return undefined;
  const color = diff > 0 ? "var(--good)" : "var(--bad)";
  return { backgroundColor: `color-mix(in oklab, ${color} ${level}%, transparent)` };
}

export function TeamTable({ teams, region, summary }: { teams: TeamResult[]; region: Counts; summary: Summary }) {
  // 수치는 팀 평균과, 유월율은 지역 유월율과 비교 (시트의 '지역 평균 대비')
  const { average, regionRates } = summary;

  return (
    <div className="-mx-5 mt-4 overflow-x-auto px-5">
      <table className="w-full min-w-[900px] border-separate border-spacing-0.5 text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted">
            <th />
            <th colSpan={COUNT_METRICS.length} className="pb-1 text-left font-medium">
              수치
            </th>
            <th colSpan={RATE_METRICS.length} className="pb-1 text-left font-medium">
              유월율
            </th>
          </tr>
          <tr className="text-xs">
            <th className="w-16" />
            {[...COUNT_METRICS, ...RATE_METRICS].map((m) => (
              <th key={m.key} className="whitespace-nowrap px-2 pb-2 text-right font-medium" title={"hint" in m ? m.hint : undefined}>
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.id}>
              <th className="whitespace-nowrap pr-2 text-left font-medium">
                {t.emoji} {t.label}
              </th>
              {COUNT_METRICS.map((m) => {
                const diff = t.counts[m.key] - average[m.key];
                return (
                  <td key={m.key} className="rounded px-2 py-1.5 text-right" style={tint(diff, average[m.key])}>
                    <div className="font-semibold">{formatCount(t.counts[m.key])}</div>
                    <div className="text-xs text-muted">{formatCountDiff(diff)}</div>
                  </td>
                );
              })}
              {RATE_METRICS.map((m) => {
                const value = t.rates[m.key];
                const base = regionRates[m.key];
                const diff = value !== null && base !== null ? value - base : null;
                return (
                  <td key={m.key} className="rounded px-2 py-1.5 text-right" style={diff !== null ? tint(diff, base!) : undefined}>
                    <div className="font-semibold">{formatRate(value)}</div>
                    <div className="text-xs text-muted">{diff !== null ? formatRateDiff(diff) : " "}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot className="text-muted">
          <tr>
            <th className="whitespace-nowrap border-t border-border pr-2 pt-2 text-left font-medium">팀 평균</th>
            {COUNT_METRICS.map((m) => (
              <td key={m.key} className="border-t border-border px-2 pt-2 text-right">
                {formatCount(Math.round(average[m.key] * 10) / 10)}
              </td>
            ))}
            <td colSpan={RATE_METRICS.length} className="border-t border-border" />
          </tr>
          <tr>
            <th className="whitespace-nowrap pr-2 text-left font-medium">지역 전체</th>
            {COUNT_METRICS.map((m) => (
              <td key={m.key} className="px-2 text-right">
                {formatCount(region[m.key])}
              </td>
            ))}
            {RATE_METRICS.map((m) => (
              <td key={m.key} className="px-2 text-right font-semibold text-foreground">
                {formatRate(regionRates[m.key])}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
