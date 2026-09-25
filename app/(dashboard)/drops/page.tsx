import { CaptureArea } from "@/components/CaptureArea";
import { PageHeader } from "@/components/PageHeader";
import { RefreshBar } from "@/components/RefreshBar";
import { dataFetchedAt } from "@/lib/data-time";
import { CourseWeekPicker, selectCourseWeek } from "@/components/CourseWeekPicker";
import { ReasonBars } from "@/components/ReasonBars";
import { ReasonHeatmap } from "@/components/ReasonHeatmap";
import { requireUser } from "@/lib/dal";
import { getDropData, sumDrops } from "@/lib/drops";

export default async function DropsPage({ searchParams }: PageProps<"/drops">) {
  await requireUser();
  const params = await searchParams;
  const { reasons, courses } = await getDropData();

  // 개강 하나·주차 하나 (?c=43-9&w=8|all)
  const { course, weeks, week, weekLabel } = selectCourseWeek(courses, params);
  const all = sumDrops([...(course?.weeks.values() ?? [])]);
  const current = week === "all" ? all : (course?.weeks.get(week as number) ?? sumDrops([]));
  const dropped = [...current.reasons.values()].reduce((a, b) => a + b, 0);
  const topReason = [...current.reasons].sort((a, b) => b[1] - a[1])[0];

  const heatRows = [
    ...weeks.map((w) => ({ key: String(w), label: `${w}주차`, href: { query: { c: course?.id, w } }, active: week === w, data: course!.weeks.get(w)! })),
    { key: "all", label: "전체", href: { query: { c: course?.id, w: "all" } }, active: week === "all", data: all },
  ];
  const captionBase = `새빛지역 · 43년 ${course?.label ?? ""}`;
  const fileBase = `탈락사유_${course?.label ?? ""}`.replace(/\s/g, "");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="타찾 탈락사유 비교"
        description={<>개강 하나, 주차 하나를 골라 찾기가 어떤 사유로 탈락했는지 봐요</>}
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      <CourseWeekPicker courses={courses} course={course} weeks={weeks} week={week} />

      {/* 요약 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`${weekLabel} 찾기`} value={`${current.finds.toLocaleString()}명`} />
        <Stat label="탈락 사유 기록" value={`${dropped.toLocaleString()}명`} />
        <Stat label="탈락률" value={current.finds ? `${((dropped / current.finds) * 100).toFixed(1)}%` : "–"} sub="찾기 중 탈락 사유가 적힌 비율" />
        <Stat label="가장 많은 사유" value={topReason ? topReason[0] : "–"} sub={topReason && dropped ? `${((topReason[1] / dropped) * 100).toFixed(1)}% · ${topReason[1]}명` : undefined} small />
      </section>

      <CaptureArea className="card space-y-5 p-5" fileName={`${fileBase}_${weekLabel}`.replace(/\s/g, "")} caption={`${captionBase} · ${weekLabel} · 탈락 사유`}>
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          {course?.label} · {weekLabel} <span className="text-xs font-normal text-muted">탈락 사유 순위 · 비율은 탈락 사유가 적힌 찾기 중</span>
        </h2>
        {dropped === 0 ? <p className="py-12 text-center text-sm text-muted">이 개강·주차에는 탈락 사유 기록이 없어요.</p> : <ReasonBars rows={reasons.map((r) => ({ label: r, count: current.reasons.get(r) ?? 0 }))} />}
      </CaptureArea>

      {course && weeks.length > 0 && (
        <CaptureArea className="card space-y-4 p-5" fileName={`${fileBase}_주차별`} caption={`${captionBase} · 주차별 탈락 사유 비율`}>
          <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
            {course.label} 주차별 비교
            <span className="text-xs font-normal text-muted">칸 = 그 주차 탈락 중 사유 비율 · 진할수록 높음 · 주차를 누르면 위 순위가 바뀌어요</span>
          </h2>
          <ReasonHeatmap reasons={reasons} rows={heatRows} />
          <p className="text-xs text-muted">
            탈락 사유(K열)가 빈 찾기는 탈락하지 않은 것(진행 중·다음 단계)으로 보고 사유 비율에서 빼요. 사유 열은 43년 전체에서 많은 순서예요.
          </p>
        </CaptureArea>
      )}
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
