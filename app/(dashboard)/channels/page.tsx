import { CaptureArea } from "@/components/CaptureArea";
import { RefreshBar } from "@/components/RefreshBar";
import { dataFetchedAt } from "@/lib/data-time";
import { CourseWeekPicker, selectCourseWeek } from "@/components/CourseWeekPicker";
import { DonutChart } from "@/components/DonutChart";
import { Mascot, Star } from "@/components/Mascot";
import { StackedShare } from "@/components/StackedShare";
import { getChannelData, OTHER } from "@/lib/channels";
import { requireUser } from "@/lib/dal";

// 섭외유형 색: 43년 전체 순위대로 고정 (선택을 바꿔도 같은 유형은 같은 색). 기타는 회색
const colorOf = (categories: string[], label: string) =>
  label === OTHER ? "color-mix(in oklab, var(--muted) 45%, var(--surface))" : `var(--cat-${categories.indexOf(label) + 1})`;

export default async function ChannelsPage({ searchParams }: PageProps<"/channels">) {
  await requireUser();
  const params = await searchParams;
  const { categories, otherMembers, courses } = await getChannelData();

  // 개강 하나·주차 하나 (?c=43-9&w=8|all)
  const { course, weeks, week, weekLabel } = selectCourseWeek(courses, params);

  const counts = new Map<string, number>();
  for (const [w, byType] of course?.weeks ?? []) {
    if (week !== "all" && w !== week) continue;
    for (const [type, n] of byType) counts.set(type, (counts.get(type) ?? 0) + n);
  }
  const slices = categories.map((label) => ({ label, value: counts.get(label) ?? 0, color: colorOf(categories, label) }));

  // 아래 100% 누적 막대: 이 개강의 주차별 비율 (큰 주차부터) + 맨 아래 전체
  const allCounts = new Map<string, number>();
  for (const byType of course?.weeks.values() ?? []) for (const [t, n] of byType) allCounts.set(t, (allCounts.get(t) ?? 0) + n);
  const shareRows = [
    ...weeks.map((w) => ({ key: String(w), label: `${w}주차`, href: { query: { c: course?.id, w } }, active: week === w, counts: course!.weeks.get(w)! })),
    { key: "all", label: "전체", href: { query: { c: course?.id, w: "all" } }, active: week === "all", counts: allCounts },
  ];
  const caption = course ? `새빛지역 · 43년 ${course.label} · ${weekLabel} · 섭외유형별 찾기 수` : "";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center gap-3">
        <Mascot size={48} />
        <div>
          <h1 className="text-3xl">섭외유형 비교</h1>
          <p className="mt-0.5 text-sm text-muted">개강 하나, 주차 하나를 골라 찾기가 어떤 섭외유형으로 이루어졌는지 봐요</p>
        </div>
        {/* 데이터 기준 시각 + 새로고침 (데이터를 다 읽은 뒤라 이 요청의 기준 시각이 정해져 있음) */}
        <div className="ml-auto">
          <RefreshBar at={dataFetchedAt()} />
        </div>
      </header>

      <CourseWeekPicker courses={courses} course={course} weeks={weeks} week={week} />

      <CaptureArea className="card space-y-6 p-5" fileName={`섭외유형_${course?.label ?? ""}_${weekLabel}`.replace(/\s/g, "")} caption={caption}>
        <h2 className="flex flex-wrap items-center gap-2 pr-36 text-xl sm:pr-40">
          <Star size={20} /> {course?.label} · {weekLabel} <span className="font-sans text-sm text-muted">섭외유형별 찾기 수</span>
        </h2>
        {counts.size === 0 ? (
          <p className="py-16 text-center text-sm text-muted">이 개강·주차에는 찾기 데이터가 없어요.</p>
        ) : (
          <DonutChart slices={slices} />
        )}
        <p className="text-xs text-muted">
          개강은 찾기 주차 가운데의 &lsquo;N월&rsquo;로 구분해요 (예: 43년 9월 8주차 → 9월 개강 8주차).
          {otherMembers.length > 0 && ` 기타에는 43년 전체에서 1% 미만인 유형(${otherMembers.join(", ")})이 함께 묶여 있어요.`}
        </p>
      </CaptureArea>

      {course && weeks.length > 0 && (
        <CaptureArea
          className="card space-y-5 p-5"
          fileName={`섭외유형_주차별비율_${course.label}`.replace(/\s/g, "")}
          caption={`새빛지역 · 43년 ${course.label} · 주차별 섭외유형 비율`}
        >
          <h2 className="flex flex-wrap items-center gap-2 pr-36 text-xl sm:pr-40">
            <Star size={20} /> {course.label} 주차별 비율 <span className="font-sans text-sm text-muted">주차마다 섭외유형 구성이 어떻게 바뀌는지 · 줄을 누르면 위 도넛이 그 주차로 바뀌어요</span>
          </h2>
          <StackedShare categories={categories.map((label) => ({ label, color: colorOf(categories, label) }))} rows={shareRows} />
        </CaptureArea>
      )}
    </main>
  );
}
