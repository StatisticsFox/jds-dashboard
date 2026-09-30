import { RefreshBar } from "@/components/RefreshBar";
import { dataFetchedAt } from "@/lib/data-time";
import { CaptureArea } from "@/components/CaptureArea";
import { Chip, ChipRow } from "@/components/Chip";
import { PageHeader } from "@/components/PageHeader";
import { ReasonBars } from "@/components/ReasonBars";
import { ReasonHeatmap } from "@/components/ReasonHeatmap";
import { StackedShare } from "@/components/StackedShare";
import { TeamChipRow } from "@/components/TeamChips";
import { preferredCourse } from "@/lib/course-pref";
import { requireUser } from "@/lib/dal";
import { pickTeam } from "@/lib/teams";
import { countDrops, getFruitDropData, REACHED_LABEL, STAGE_ORDER, stageBreakdown, STAGES, type StageFilter } from "@/lib/fruit-drops";

const isStage = (v: unknown): v is StageFilter => typeof v === "string" && v in STAGES;

export default async function FruitDropsPage({ searchParams }: PageProps<"/fruit-drops">) {
  await requireUser();
  const params = await searchParams;
  const { reasons, courses } = await getFruitDropData();

  // 개강 하나 또는 전체 (?c=43-9|all), 탈락 단계 (?s=all|sangye|jeongpa|sangdam|yukye|yuk)
  const pref = await preferredCourse();
  const courseId = params.c === "all" ? "all" : (courses.find((c) => c.id === params.c) ?? courses.find((c) => c.id === pref) ?? courses.at(-1))?.id;
  const course = courses.find((c) => c.id === courseId);
  const stage: StageFilter = isStage(params.s) ? params.s : "all";
  const courseLabel = courseId === "all" ? "43년 전체" : (course?.label ?? "");
  // 팀 하나(?t=3, 인도 팀 기준) 또는 전체. 아래 모든 집계를 그 팀 열매로만
  const { team, teamLabel } = pickTeam(params);
  const teamFruits = (c: (typeof courses)[number]) => (team ? c.fruits.filter((f) => f.team === team) : c.fruits);
  const allFruits = courses.flatMap(teamFruits);
  const fruits = courseId === "all" ? allFruits : course ? teamFruits(course) : [];
  const teamSuffix = team ? ` · ${teamLabel}` : "";

  // 분모: 고른 단계까지 온 열매 (상예 = 상담 예정 이상, 정파 = 정파 단계 이상, 상담 = 상담 단계 이상 …)
  const current = countDrops(fruits, stage);
  const allDropped = fruits.filter((f) => f.reason).length;
  const dropped = [...current.reasons.values()].reduce((a, b) => a + b, 0);
  const topReason = [...current.reasons].sort((a, b) => b[1] - a[1])[0];
  const stageLabel = stage === "all" ? "" : ` · ${STAGES[stage]} 탈락`;
  // 단계 칩에 보여줄 개수: 지금 고른 개강에서 그 단계에서 탈락한 열매 수
  const stageCounts = stageBreakdown(fruits);
  // 정파 단계가 처음 기록된 개강 (그 전 개강은 정파 기록이 없음)
  const firstJeongpa = courses.find((c) => c.fruits.some((f) => f.stage === "jeongpa"));

  // 칩·줄 주소: 지금 고른 개강·단계·팀을 유지하고 일부만 바꿈 (팀 전체면 t를 뺌)
  const href = (next: { c?: string; s?: string; t?: number }) => {
    const query: Record<string, string | number | undefined> = { c: courseId, s: stage, t: team, ...next };
    if (!query.t) delete query.t;
    return { query };
  };

  // 단계별 탈락 분포 막대: 탈락한 열매를 진행 순서대로 (색은 순서대로 고정)
  const stageCategories = STAGE_ORDER.map((st, i) => ({ label: STAGES[st], color: `var(--cat-${i + 1})` }));
  const stageRows = [
    ...courses.map((c) => ({ key: c.id, label: c.label, href: href({ c: c.id }), active: courseId === c.id, counts: stageBreakdown(teamFruits(c)) })),
    { key: "all", label: "43년 전체", href: href({ c: "all" }), active: courseId === "all", counts: stageBreakdown(allFruits) },
  ];

  const heatRows = [
    ...courses.map((c) => ({ key: c.id, label: c.label, href: href({ c: c.id }), active: courseId === c.id, data: countDrops(teamFruits(c), stage) })),
    { key: "all", label: "43년 전체", href: href({ c: "all" }), active: courseId === "all", data: countDrops(allFruits, stage) },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="열매 탈락사유 비교"
        description={<>상담 예정 이상 열매가 목표 개강까지 가는 동안 어떤 사유로 탈락했는지 봐요 (팀은 인도 팀 기준)</>}
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      <section className="card space-y-3 p-5">
        <ChipRow label="목표 개강">
          {courses.map((c) => (
            <Chip key={c.id} href={href({ c: c.id })} active={courseId === c.id}>
              {c.label.replace(" 개강", "")}
            </Chip>
          ))}
          <Chip href={href({ c: "all" })} active={courseId === "all"}>
            43년 전체
          </Chip>
        </ChipRow>
        <ChipRow label="탈락 단계" className="border-t border-grid pt-3">
          {(["all", ...STAGE_ORDER] as StageFilter[]).map((s) => {
            const n = s === "all" ? allDropped : (stageCounts.get(STAGES[s]) ?? 0);
            return (
              <Chip key={s} href={href({ s })} active={stage === s} title="그 단계에서 탈락한 열매 수">
                {STAGES[s]} <span className="font-normal opacity-60">{n}</span>
              </Chip>
            );
          })}
        </ChipRow>
        <TeamChipRow team={team} href={(id) => href({ t: id })} />
      </section>

      {/* 요약 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={`${courseLabel} 열매`} value={`${current.finds.toLocaleString()}명`} sub={REACHED_LABEL[stage]} />
        <Stat
          label={stage === "all" ? "탈락" : `${STAGES[stage]} 탈락`}
          value={`${dropped.toLocaleString()}명`}
          sub={current.finds ? `탈락률 ${((dropped / current.finds) * 100).toFixed(1)}%` : undefined}
        />
        <Stat
          label="가장 많은 사유"
          value={topReason ? topReason[0] : "–"}
          sub={topReason && dropped ? `${((topReason[1] / dropped) * 100).toFixed(1)}% · ${topReason[1]}명` : undefined}
          small
        />
      </section>

      <CaptureArea className="card space-y-5 p-5" fileName={`열매_단계별탈락분포${team ? `_${teamLabel}` : ""}`} caption={`새빛지역${teamSuffix} · 상담 예정 이상 열매 · 목표 개강별 탈락 단계 분포`}>
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          단계별 탈락 분포
          {teamSuffix}
          <span className="text-xs font-normal text-muted">개강마다 탈락한 열매가 어느 단계에서 빠졌는지 (100% = 탈락 인원) · 줄을 누르면 그 개강으로 바뀌어요</span>
        </h2>
        <StackedShare categories={stageCategories} rows={stageRows} rowLabel="목표 개강" />
        {firstJeongpa && (
          <p className="text-xs text-muted">
            정파 단계는 {firstJeongpa.label}부터 기록돼 있어요. 그 전 개강은 정파 탈락이 따로 없어요.
          </p>
        )}
      </CaptureArea>

      <CaptureArea
        className="card space-y-5 p-5"
        fileName={`열매탈락사유_${courseLabel}${stageLabel}${teamSuffix}`.replace(/[\s·]/g, "")}
        caption={`새빛지역${teamSuffix} · 상담 예정 이상 열매 · 목표 ${courseLabel}${stageLabel} · 탈락 사유`}
      >
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          {courseLabel}
          {stageLabel}
          {teamSuffix} <span className="text-xs font-normal text-muted">탈락 사유 순위 · 비율은 탈락한 열매 중</span>
        </h2>
        {dropped === 0 ? (
          <p className="py-12 text-center text-sm text-muted">이 조건에는 탈락 기록이 없어요.</p>
        ) : (
          <ReasonBars rows={reasons.map((r) => ({ label: r, count: current.reasons.get(r) ?? 0 }))} />
        )}
      </CaptureArea>

      <CaptureArea className="card space-y-4 p-5" fileName={`열매탈락사유_개강별${stageLabel}${teamSuffix}`.replace(/[\s·]/g, "")} caption={`새빛지역${teamSuffix} · 상담 예정 이상 열매 · 목표 개강별 탈락 사유 비율${stageLabel}`}>
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          목표 개강별 비교
          {teamSuffix}
          <span className="text-xs font-normal text-muted">칸 = 그 개강 탈락 중 사유 비율 · 진할수록 높음 · 개강을 누르면 위 순위가 바뀌어요</span>
        </h2>
        <ReasonHeatmap reasons={reasons} rows={heatRows} rowLabel="목표 개강" unit="열매" />
        <p className="text-xs text-muted">
          탈락률의 분모는 고른 단계까지 온 열매예요: 상예 = 상담 예정 이상, 정파 = 정파 단계 이상(상예 탈락 제외), 상담 = 상담 단계 이상(상예·정파 탈락 제외), 육따기 = A열이 육따기로 시작하는 열매(육따기 예정 제외, A열에 탈락이 있으면 탈락).
          탈락 단계는 단계(A열)로 나눠요: 상담 예정 → 상예, 상담 정파 → 정파, 상담 심각·미비·보류 → 상담, 육따기 예정 → 육따기 예정, 육따기 심각·미비 → 육따기.
        </p>
      </CaptureArea>
    </main>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 truncate font-cute ${small ? "text-xl" : "text-3xl"} tabular-nums`} title={value}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
