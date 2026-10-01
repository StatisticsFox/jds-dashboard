import { CaptureArea } from "@/components/CaptureArea";
import { CrossTable } from "@/components/CrossTable";
import { LineChart } from "@/components/LineChart";
import { PageHeader } from "@/components/PageHeader";
import { PendingLink } from "@/components/Pending";
import { RefreshBar } from "@/components/RefreshBar";
import { COUNT_METRICS, RATE_METRICS } from "@/lib/conversion";
import { requireUser } from "@/lib/dal";
import { dataFetchedAt } from "@/lib/data-time";
import { formatCount, formatRate } from "@/lib/format";
import { getOtStats } from "@/lib/ot-stats";
import { getRegionConversion, type CourseConversion } from "@/lib/region-conversion";

// "2026-07-20" → "7. 20."
const md = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}. ${d}.`;
};

export default async function RegionConversionPage() {
  await requireUser();
  const [courses, otStats] = await Promise.all([getRegionConversion(), getOtStats()]);
  const countLabel = Object.fromEntries(COUNT_METRICS.map((m) => [m.key, m.label])) as Record<string, string>;
  // 이관 = '43년 센터등록 명단 및 유월율' 시트의 육따기 최대 수치 (전도 → 복음방 파트로 넘어간 열매). 시트에 없는 개강은 null
  const transferOf = (c: CourseConversion) => otStats.get(c.id)?.yukMax ?? null;

  // 유월율 열: 팀별 유월율과 같은 5가지 + 이관성공율(이관 ÷ 육따기 누적)을 상담 → 육따기 다음에
  type RateCol = { key: string; label: string; value: (c: CourseConversion) => number | null; tip: (c: CourseConversion) => string };
  const base: RateCol[] = RATE_METRICS.map((m) => ({
    key: m.key,
    label: m.label,
    value: (c) => c.rates[m.key],
    tip: (c) => `${countLabel[m.numerator]} ${formatCount(c.counts[m.numerator])} ÷ ${countLabel[m.denominator]} ${formatCount(c.counts[m.denominator])}`,
  }));
  const transferRate: RateCol = {
    key: "transfer",
    label: "이관성공율",
    value: (c) => {
      const t = transferOf(c);
      return t !== null && c.counts.yukCum ? t / c.counts.yukCum : null;
    },
    tip: (c) => (transferOf(c) === null ? "이관 집계 전" : `이관 ${formatCount(transferOf(c)!)} ÷ 육따기 누적 ${formatCount(c.counts.yukCum)}`),
  };
  const at = base.findIndex((r) => r.key === "sangdamToYuk") + 1;
  const RATES = [...base.slice(0, at), transferRate, ...base.slice(at)];

  // 가로축 = 개강, 선 = 유월율 5가지 (값은 % 숫자, 소수 첫째 자리)
  // 진행 중인 개강은 상담·육따기가 아직 쌓이는 중이라 선이 뚝 떨어져 보여서 그래프에서는 빼고 표에만 보여줌
  const charted = courses.filter((c) => !c.ongoing);
  const ongoing = courses.find((c) => c.ongoing);
  const xLabels = charted.map((c) => c.label.replace(" 개강", ""));
  const series = RATES.map((r, i) => ({
    id: r.key,
    label: r.label,
    color: `var(--cat-${i + 1})`,
    values: charted.map((c) => {
      const v = r.value(c);
      return v === null ? null : Math.round(v * 1000) / 10;
    }),
  }));
  const hasEstimated = courses.some((c) => !c.official);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="지역 유월율 · 월별 추이"
        description="개강마다 새빛지역 전체의 유월율이 어떻게 바뀌는지 봐요 · 계산 방식은 팀별 유월율 탭과 같아요"
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      <CaptureArea className="card space-y-5 p-5" fileName="지역유월율_개강별" caption="새빛지역 · 43년 개강별 지역 유월율">
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          개강별 지역 유월율
          <span className="text-xs font-normal text-muted">
            범례에 올리면 그 선만 강조, 누르면 숨기거나 다시 보여요{ongoing && ` · 진행 중인 ${ongoing.label}은 아래 표에만 있어요`}
          </span>
        </h2>
        <div className="-mx-2 overflow-x-auto px-2">
          <div className="min-w-[560px]">
            <LineChart xLabels={xLabels} series={series} unit="%" legend max={100} />
          </div>
        </div>

        {/* 표: 행 = 개강, 열 = 유월율 */}
        <CrossTable>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-max border-separate border-spacing-0 text-sm tabular-nums">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="sticky left-0 border-b border-border bg-surface py-2 pr-4 text-left font-medium">개강</th>
                  {RATES.map((m, i) => (
                    <th key={m.key} data-r="h" data-c={i} className="border-b border-border px-3 py-2 text-right font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: `var(--cat-${i + 1})` }} />
                        {m.label}
                      </span>
                    </th>
                  ))}
                  <th className="border-b border-border px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {[...courses].reverse().map((c, ri) => (
                  <tr key={c.id} className="hover:bg-accent-soft/50">
                    <th data-r={ri} data-c="h" className="sticky left-0 border-b border-grid bg-surface py-2 pr-4 text-left font-medium">
                      {c.label}
                      {c.ongoing && <span className="ml-1.5 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent-strong">진행 중</span>}
                    </th>
                    {RATES.map((m, ci) => (
                      <td
                        key={m.key}
                        data-r={ri}
                        data-c={ci}
                        data-tip={`${c.label} · ${m.label}\n${formatRate(m.value(c))} = ${m.tip(c)}`}
                        className="border-b border-grid px-3 py-2 text-right font-medium"
                      >
                        {formatRate(m.value(c))}
                      </td>
                    ))}
                    <td className="border-b border-grid px-3 py-2 text-right">
                      <PendingLink
                        href={{
                          pathname: "/",
                          query: { ts: c.settings.tachatStart, te: c.settings.tachatEnd, ss: c.settings.sangyeStart, se: c.settings.sangyeEnd, course: c.settings.course },
                        }}
                        className="whitespace-nowrap text-xs text-muted hover:text-foreground hover:underline"
                      >
                        팀별 보기 →
                      </PendingLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CrossTable>
      </CaptureArea>

      {/* 수치·기간 */}
      <CaptureArea className="card space-y-4 p-5" fileName="지역유월율_수치와기간" caption="새빛지역 · 43년 개강별 수치와 계산 기간">
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          수치와 계산 기간
          <span className="text-xs font-normal text-muted">유월율의 분자·분모가 되는 지역 전체 인원</span>
        </h2>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-max border-separate border-spacing-0 text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-muted">
                <th className="border-b border-border py-2 pr-4 text-left font-medium">개강</th>
                <th className="border-b border-border px-3 py-2 text-left font-medium">찾기 기간</th>
                <th className="border-b border-border px-3 py-2 text-left font-medium">상예 기간</th>
                {COUNT_METRICS.map((m) => [
                  <th key={m.key} title={m.hint} className="border-b border-border px-3 py-2 text-right font-medium">
                    {m.label}
                  </th>,
                  // 육따기 누적 바로 다음에 이관
                  m.key === "yukCum" && (
                    <th key="transfer" title="'43년 센터등록 명단 및 유월율' 시트의 육따기 최대 수치 (전도 → 복음방 파트로 이관된 열매)" className="border-b border-border px-3 py-2 text-right font-medium">
                      이관
                    </th>
                  ),
                ])}
              </tr>
            </thead>
            <tbody>
              {[...courses].reverse().map((c) => (
                <tr key={c.id} className="hover:bg-accent-soft/50">
                  <th className="border-b border-grid py-2 pr-4 text-left font-medium">{c.label}</th>
                  <td className="whitespace-nowrap border-b border-grid px-3 py-2">
                    {md(c.settings.tachatStart)} ~ {md(c.settings.tachatEnd)}
                    {!c.official && <span className="ml-1.5 rounded border border-border px-1 text-[10px] text-muted">추정</span>}
                  </td>
                  <td className="whitespace-nowrap border-b border-grid px-3 py-2">
                    {md(c.settings.sangyeStart)} ~ {md(c.settings.sangyeEnd)}
                  </td>
                  {COUNT_METRICS.map((m) => [
                    <td key={m.key} className="border-b border-grid px-3 py-2 text-right">
                      {formatCount(c.counts[m.key])}
                    </td>,
                    m.key === "yukCum" && (
                      <td key="transfer" className={`border-b border-grid px-3 py-2 text-right ${transferOf(c) === null ? "text-muted/50" : ""}`}>
                        {transferOf(c) === null ? "–" : formatCount(transferOf(c)!)}
                      </td>
                    ),
                  ])}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          기간은 시트 &lsquo;각 개강별 기간&rsquo; 탭에 있는 개강은 그 기간을 그대로 쓰고,
          {hasEstimated && " 없는 개강(추정)은 찾기·상담 기록에 적힌 날짜별 주차로 그 개강의 첫 주차~마지막 주차 날짜를 찾아 찾기·상예 기간으로 같이 써요."}
          {" "}상담·육따기는 기간이 아니라 개강월로 세요. 이관은 &lsquo;43년 센터등록 명단 및 유월율&rsquo; 시트의 육따기 최대 수치(전도 → 복음방 파트로 이관된 열매)이고, 이관성공율 = 이관 ÷ 육따기 누적이에요. 그 시트에 아직 없는 개강은 –로 보여요. &lsquo;진행 중&rsquo; 개강은 상담·육따기가 아직 쌓이는 중이라 그래프에서 빼 두었어요.
        </p>
      </CaptureArea>
    </main>
  );
}
