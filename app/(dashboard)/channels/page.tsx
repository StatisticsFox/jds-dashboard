import Link from "next/link";
import { CaptureArea } from "@/components/CaptureArea";
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

  // 개강 하나 (?c=43-9). 없으면 가장 최근 개강
  const course = courses.find((c) => c.id === params.c) ?? courses.at(-1);
  // 주차 하나 (?w=8) 또는 전체 (?w=all). 없으면 그 개강의 가장 최근(작은) 주차
  const weeks = course ? [...course.weeks.keys()].sort((a, b) => b - a) : [];
  const week = params.w === "all" ? "all" : (weeks.find((w) => String(w) === params.w) ?? weeks.at(-1));

  const counts = new Map<string, number>();
  for (const [w, byType] of course?.weeks ?? []) {
    if (week !== "all" && w !== week) continue;
    for (const [type, n] of byType) counts.set(type, (counts.get(type) ?? 0) + n);
  }
  const slices = categories.map((label) => ({ label, value: counts.get(label) ?? 0, color: colorOf(categories, label) }));
  const weekLabel = week === "all" ? "전체 주차" : `${week}주차`;

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
      <header className="flex items-center gap-3">
        <Mascot size={48} />
        <div>
          <h1 className="text-3xl">섭외유형 비교</h1>
          <p className="mt-0.5 text-sm text-muted">개강 하나, 주차 하나를 골라 찾기가 어떤 섭외유형으로 이루어졌는지 봐요</p>
        </div>
      </header>

      <section className="card space-y-5 p-5">
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-2 text-xl">
            <Star size={20} /> 개강
          </h2>
          <div className="flex flex-wrap gap-2">
            {courses.map((c) => {
              const on = c.id === course?.id;
              // 개강을 바꾸면 같은 주차가 있으면 유지, 없으면 그 개강의 기본 주차
              const keepWeek = week === "all" || c.weeks.has(week as number) ? String(week) : undefined;
              return (
                <Link
                  key={c.id}
                  href={{ query: { c: c.id, ...(keepWeek && { w: keepWeek }) } }}
                  scroll={false}
                  aria-current={on}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    on ? "border-transparent bg-accent font-semibold text-accent-ink shadow-sm" : "border-border text-muted hover:border-accent hover:bg-accent-soft hover:text-foreground"
                  }`}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="space-y-2.5 border-t border-grid pt-4">
          <h2 className="flex items-center gap-2 text-xl">
            <Star size={20} /> 주차
          </h2>
          <div className="flex flex-wrap gap-2">
            {[...weeks.map(String), "all"].map((w) => {
              const on = String(week) === w;
              return (
                <Link
                  key={w}
                  href={{ query: { c: course?.id, w } }}
                  scroll={false}
                  aria-current={on}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    on ? "border-transparent bg-accent font-semibold text-accent-ink shadow-sm" : "border-border text-muted hover:border-accent hover:bg-accent-soft hover:text-foreground"
                  }`}
                >
                  {w === "all" ? "전체" : `${w}주차`}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

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
