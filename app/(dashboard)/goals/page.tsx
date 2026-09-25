import { CaptureArea } from "@/components/CaptureArea";
import { Chip, ChipRow } from "@/components/Chip";
import { PageHeader } from "@/components/PageHeader";
import { LineChart } from "@/components/LineChart";
import { RefreshBar } from "@/components/RefreshBar";
import { TEAMS } from "@/lib/conversion";
import { preferredCourse } from "@/lib/course-pref";
import { requireUser } from "@/lib/dal";
import { dataFetchedAt } from "@/lib/data-time";
import { formatCount } from "@/lib/format";
import { cumulativeTo, getGoalData, STAGES, TEAM_IDS, targetOf, weeksOf, type GoalStage } from "@/lib/goals";


// missing: 실적 자료 자체가 아직 없음 (예: 센터등록 자료에 아직 없는 개강)
// missing: 실적 자료 자체가 아직 없음 (예: 센터등록 자료에 아직 없는 개강)
type Cell = { actual: number; target: number | null; missing?: boolean };

export default async function GoalsPage({ searchParams }: PageProps<"/goals">) {
  await requireUser();
  const params = await searchParams;
  const { targets, actuals, centerCount, courseIds } = await getGoalData();

  // 개강 (?c=43-9). 없으면 실적(타찾)이 있는 가장 최근 개강
  const withData = courseIds.filter((c) => weeksOf(actuals, c, "tachat").size > 0);
  const pref = await preferredCourse();
  const courseId = courseIds.find((c) => c === params.c) ?? courseIds.find((c) => c === pref) ?? withData.at(-1) ?? courseIds.at(-1) ?? "";
  const [year, month] = courseId.split("-");
  const courseName = `${year}년 ${month}월 개강`;
  // 그래프에 볼 팀 (?t=1~7, 없으면 지역 전체)
  const chartTeam = TEAM_IDS.find((t) => String(t) === params.t);
  const href = (next: { c?: string; t?: number | undefined }) => ({ query: { c: courseId, ...(next.t ?? chartTeam ? { t: next.t ?? chartTeam } : {}), ...(next.c && { c: next.c }) } });

  // 현재 주차: 이 개강 타찾·상담 실적 중 가장 작은(최근) 주차. 실적이 없으면 목표 전(null)
  const recorded = [...weeksOf(actuals, courseId, "tachat").keys(), ...weeksOf(actuals, courseId, "sangdam").keys()];
  const currentWeek = recorded.length ? Math.min(...recorded) : null;

  // 한 칸: 지정 목표 열 값 대비 지금까지의 누적 실적
  const cellOf = (stage: GoalStage, team?: number): Cell => {
    const target = targetOf(weeksOf(targets, courseId, stage, team));
    if (stage === "center") return { actual: centerCount.get(courseId) ?? 0, target, missing: !centerCount.has(courseId) };
    return { actual: cumulativeTo(weeksOf(actuals, courseId, stage, team)), target };
  };

  const rows = [
    ...TEAMS.map((t) => ({ key: String(t.id), label: `${t.emoji} ${t.label}`, team: t.id as number | undefined })),
    { key: "all", label: "지역 합계", team: undefined },
  ];

  // 목표선 그래프: 주차 축 = 실적이 있는 주차 (큰 주차 → 작은 주차), 목표는 목표 열 값의 가로선
  const lineFor = (stage: "tachat" | "sangdam") => {
    const a = weeksOf(actuals, courseId, stage, chartTeam);
    const allWeeks = [...a.keys()].sort((x, y) => y - x);
    const actualWeeks = [...a.keys()];
    const lo = actualWeeks.length ? Math.min(...actualWeeks) : null;
    const target = targetOf(weeksOf(targets, courseId, stage, chartTeam));
    const col = STAGES.find((s) => s.key === stage)!.col;
    return {
      weeks: allWeeks,
      series: [
        {
          id: "target",
          label: `목표(${col}열)`,
          color: "var(--muted)",
          dashed: true,
          values: allWeeks.map(() => target),
        },
        { id: "actual", label: "실적", color: "var(--cat-1)", values: allWeeks.map((w) => (lo !== null && w >= lo ? cumulativeTo(a, w) : null)) },
      ],
    };
  };
  const chartWho = chartTeam ? TEAMS.find((t) => t.id === chartTeam)!.label : "지역 전체";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="목표 달성"
        description={<>개강·팀별로 단계 목표를 얼마나 채웠는지 봐요</>}
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      <section className="card p-5">
        <ChipRow label="43년 개강">
          {courseIds.map((c) => (
            <Chip key={c} href={{ query: { c, ...(chartTeam && { t: chartTeam }) } }} active={c === courseId}>
              {c.split("-")[1]}월
            </Chip>
          ))}
        </ChipRow>
      </section>

      <CaptureArea className="card space-y-4 p-5" fileName={`목표달성_${courseName}`.replace(/\s/g, "")} caption={`새빛지역 · ${courseName} · 목표 대비 달성률${currentWeek ? ` (${currentWeek}주차 기준)` : ""}`}>
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          {courseName} 달성률
          <span className="text-xs font-normal text-muted">
            {currentWeek ? `실적은 ${currentWeek}주차까지 누적 · 목표는 단계별 지정 열 (타찾 J · 상담예정 N · 상담 S · 육따기 V · 센터등록 AB)` : "아직 실적이 없어요"}
          </span>
        </h2>

        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[760px] border-separate border-spacing-1 text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-muted">
                <th className="px-2 text-left font-medium">팀</th>
                {STAGES.map((s) => (
                  <th key={s.key} className="px-2 text-left font-medium">
                    {s.label}
                    <span className="ml-1 font-normal text-muted/70">{s.col}열</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th className={`whitespace-nowrap px-2 text-left font-medium ${r.team ? "" : "border-t border-border pt-2"}`}>{r.label}</th>
                  {STAGES.map((s) => (
                    <td key={s.key} className={r.team ? "" : "border-t border-border pt-2"}>
                      {s.key === "center" && r.team ? <span className="px-2 text-xs text-muted/60">팀 정보 없음</span> : <GoalCell cell={cellOf(s.key, r.team)} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          달성률 100% 이상은 초록 ✓, 못 미치면 빨강으로 표시해요. 타찾 실질 = 찾기 중 정파만남이 아닌 것, 상담예정 = 열매누적 인원(탈락 포함), 육따기 = 육따기 탭 한 줄 0.5명,
          센터등록 = 센터등록 개강분석 자료 인원(지역 합계만).
        </p>
      </CaptureArea>

      {/* 목표선 그래프 */}
      <CaptureArea className="card space-y-4 p-5" fileName={`목표선_${courseName}_${chartWho}`.replace(/\s/g, "")} caption={`새빛지역 · ${courseName} · ${chartWho} · 주차별 목표 대비 실적`}>
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          주차별 진행 <span className="text-xs font-normal text-muted">점선 = 목표 (타찾 J열 · 상담 S열), 실선 = 실제 누적</span>
        </h2>
        <ChipRow label="팀">
          <Chip href={{ query: { c: courseId } }} active={!chartTeam}>
            지역 전체
          </Chip>
          {TEAMS.map((t) => (
            <Chip key={t.id} href={href({ t: t.id })} active={chartTeam === t.id}>
              {t.emoji} {t.label}
            </Chip>
          ))}
        </ChipRow>
        <div className="grid gap-4 lg:grid-cols-2">
          {(["tachat", "sangdam"] as const).map((st) => {
            const { weeks, series } = lineFor(st);
            return (
              <div key={st} className="tile p-4">
                <p className="mb-2 font-cute text-base">
                  {STAGES.find((s) => s.key === st)!.label} · {chartWho}
                </p>
                {weeks.length ? <LineChart xLabels={weeks.map((w) => `${w}주차`)} series={series} height={230} /> : <p className="py-10 text-center text-sm text-muted">목표·실적이 없어요.</p>}
              </div>
            );
          })}
        </div>
      </CaptureArea>
    </main>
  );
}

function GoalCell({ cell }: { cell: Cell }) {
  if (cell.missing) {
    return (
      <div className="rounded-xl px-2 py-1.5 text-xs text-muted">
        등록 자료 없음{cell.target !== null && <span className="text-muted/60"> · 목표 {formatCount(cell.target)}</span>}
      </div>
    );
  }
  if (cell.target === null) {
    return (
      <div className="rounded-xl px-2 py-1.5 text-xs text-muted">
        {formatCount(cell.actual)}명 <span className="text-muted/60">· 목표 없음</span>
      </div>
    );
  }
  const pct = cell.target ? (cell.actual / cell.target) * 100 : 0;
  const ok = pct >= 100;
  return (
    <div className="rounded-xl bg-background/60 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-cute text-xl ${ok ? "text-good" : "text-bad"}`}>
          {ok ? "✓ " : ""}
          {Math.round(pct)}%
        </span>
        <span className="text-xs text-muted">
          {formatCount(cell.actual)} / {formatCount(cell.target)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-grid">
        <div className={`h-full rounded-full ${ok ? "bg-good" : "bg-bad"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
