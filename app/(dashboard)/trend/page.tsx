import { PendingLink } from "@/components/Pending";
import { RefreshBar } from "@/components/RefreshBar";
import { dataFetchedAt } from "@/lib/data-time";
import { CaptureArea } from "@/components/CaptureArea";
import { Chip, ChipRow } from "@/components/Chip";
import { CrossTable } from "@/components/CrossTable";
import { PageHeader } from "@/components/PageHeader";
import { LineChart } from "@/components/LineChart";
import { preferredCourse } from "@/lib/course-pref";
import { requireUser } from "@/lib/dal";
import {
  getCourses,
  WEEKLY_METRICS,
  weeklyTable,
  type WeeklyMetric,
} from "@/lib/weekly";

const MAX_SELECTED = 8; // 선 색(범주 팔레트)이 8가지라 동시에 8개까지
const DEFAULT_COUNT = 4;

// 지표 탭 순서
const METRICS: { key: WeeklyMetric; label: string }[] = [
  { key: "find", label: "찾기" },
  { key: "sangdam", label: "상담" },
  { key: "yuk", label: "육따기" },
];
const isMetric = (v: unknown): v is WeeklyMetric =>
  typeof v === "string" && v in WEEKLY_METRICS;

export default async function TrendPage({ searchParams }: PageProps<"/trend">) {
  await requireUser();
  const params = await searchParams;
  // 지표 (?m=find|sangdam). 없으면 찾기
  const metric: WeeklyMetric = isMetric(params.m) ? params.m : "find";
  const metricLabel = WEEKLY_METRICS[metric].label;
  const courses = await getCourses(metric);

  // 년도: 주소에 없으면 데이터의 가장 최근 년도 (지금은 43년)
  const years = [...new Set(courses.map((c) => c.year))].sort((a, b) => b - a);
  const year = years.find((y) => String(y) === params.year) ?? years[0];
  const yearCourses = courses.filter((c) => c.year === year);

  // 선택한 개강 (?c=43-9&c=43-10). 표시는 항상 개강 순서대로
  // 처음 들어왔을 때(주소에 c가 아예 없음)만 최근 4개를 기본으로 고르고,
  // 전부 해제한 상태(?c=)는 그대로 빈 그래프로 둠
  const requested = [params.c ?? []]
    .flat()
    .filter((id) => yearCourses.some((c) => c.id === id));
  const firstVisit = params.c === undefined;
  // 처음 들어왔을 때: 최근 4개. 다른 탭에서 고른 개강이 그 안에 없으면 가장 오래된 것 대신 넣음
  const pref = await preferredCourse();
  const defaults = yearCourses.slice(-DEFAULT_COUNT).map((c) => c.id);
  if (
    pref &&
    yearCourses.some((c) => c.id === pref) &&
    !defaults.includes(pref)
  )
    defaults.splice(0, 1, pref);
  const selectedIds = new Set(
    firstVisit ? defaults : requested.slice(0, MAX_SELECTED),
  );
  const selected = yearCourses.filter((c) => selectedIds.has(c.id));
  const color = (i: number) => `var(--cat-${i + 1})`;

  // 그래프·표는 누적 값. 그 주차에 새로 늘어난 수(weekly)는 툴팁과 표에 작게 함께 표시
  const { weeks, cumulative, weekly } = weeklyTable(selected);
  const series = selected.map((c, i) => ({
    id: c.id,
    label: c.label,
    color: color(i),
    values: cumulative[i],
    deltas: weekly[i],
  }));

  // 선택이 비면 c를 빈 값으로 남겨서 "선택 없음"을 기억 (없애면 처음 방문처럼 기본값이 다시 선택됨)
  const colOf = (id: string) => selected.findIndex((c) => c.id === id);
  const hrefWith = (ids: string[], m: string = metric) => ({
    query: { m, year, c: ids.length ? ids : "" },
  });
  const toggle = (id: string) =>
    selectedIds.has(id)
      ? [...selectedIds].filter((x) => x !== id)
      : [...selectedIds, id];
  const caption = `새빛지역 · ${year}년 · 개강별 동주차 누적 ${metricLabel} 인원 · ${selected.map((c) => c.label).join(", ")}`;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="열매 추이"
        description="같은 주차끼리 개강을 비교해요 · 주차는 개강에 가까워지는 순서(큰 수 → 작은 수)로 누적돼요"
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      {/* 지표 · 개강 선택 */}
      <section className="card space-y-3 p-5">
        <ChipRow label="지표">
          {METRICS.map((m) => (
            <Chip
              key={m.key}
              href={hrefWith([...selectedIds], m.key)}
              active={m.key === metric}
            >
              {m.label}
            </Chip>
          ))}
        </ChipRow>
        {years.length > 1 && (
          <ChipRow label="연도" className="border-t border-grid pt-3">
            {years.map((y) => (
              <Chip
                key={y}
                href={hrefWith(
                  [...selectedIds].filter((id) => id.startsWith(`${y}-`)),
                )}
                active={y === year}
              >
                {y}년
              </Chip>
            ))}
          </ChipRow>
        )}
        <ChipRow label={`${year}년 개강`} className="border-t border-grid pt-3">
          {yearCourses.map((c) => {
            const on = selectedIds.has(c.id);
            const full = !on && selectedIds.size >= MAX_SELECTED;
            return (
              <Chip
                key={c.id}
                href={hrefWith(toggle(c.id))}
                active={on}
                multi
                dot={
                  on
                    ? color(selected.findIndex((s) => s.id === c.id))
                    : undefined
                }
                disabled={full}
                title={
                  full ? `최대 ${MAX_SELECTED}개까지 고를 수 있어요` : undefined
                }
              >
                {c.label.replace(" 개강", "")}
              </Chip>
            );
          })}
        </ChipRow>
        <div className="flex flex-wrap gap-3 pl-0.5 text-xs text-muted sm:pl-[4.75rem]">
          <span>여러 개 고를 수 있어요 (최대 {MAX_SELECTED}개)</span>
          <PendingLink
            href={hrefWith(yearCourses.slice(-DEFAULT_COUNT).map((c) => c.id))}
            className="hover:text-foreground hover:underline"
          >
            최근 {DEFAULT_COUNT}개
          </PendingLink>
          <PendingLink
            href={hrefWith(yearCourses.slice(-MAX_SELECTED).map((c) => c.id))}
            className="hover:text-foreground hover:underline"
          >
            최근 {MAX_SELECTED}개
          </PendingLink>
          <PendingLink
            href={hrefWith([])}
            className="hover:text-foreground hover:underline"
          >
            모두 해제
          </PendingLink>
        </div>
      </section>

      <CaptureArea
        className="card space-y-5 p-5"
        fileName={`동주차_누적${metricLabel}_${year}년`}
        caption={caption}
      >
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          동주차 누적 {metricLabel} 인원{" "}
          <span className="text-xs font-normal text-muted">
            {year}년 · 첫 주차부터 그 주차까지 합산
          </span>
        </h2>

        {selected.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            위에서 개강을 하나 이상 골라 주세요.
          </p>
        ) : (
          <>
            <div className="-mx-2 overflow-x-auto px-2">
              <div className="min-w-[520px]">
                <LineChart
                  xLabels={weeks.map((w) => `${w}주차`)}
                  series={series}
                  legend
                />
              </div>
            </div>

            {/* 표: 행 = 주차, 열 = 개강 */}
            <CrossTable>
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-max border-separate border-spacing-0 text-sm tabular-nums">
                  <thead>
                    <tr className="text-xs text-muted">
                      <th className="sticky left-0 border-b border-border bg-surface py-2 pr-4 text-left font-medium">
                        주차
                      </th>
                      {selected.map((c, i) => (
                        <th
                          key={c.id}
                          data-r="h"
                          data-c={colOf(c.id)}
                          className="border-b border-border px-3 py-2 text-right font-medium"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: color(i) }}
                            />
                            {c.label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((w, wi) => (
                      <tr key={w} className="hover:bg-accent-soft/50">
                        <th
                          data-r={wi}
                          data-c="h"
                          className="sticky left-0 border-b border-grid bg-surface py-2 pr-4 text-left font-medium"
                        >
                          {w}주차
                        </th>
                        {cumulative.map((col, ci) => (
                          <td
                            key={selected[ci].id}
                            data-r={wi}
                            data-c={ci}
                            data-tip={
                              col[wi] === null
                                ? `${selected[ci].label} · ${w}주차\n데이터 없음`
                                : `${selected[ci].label} · ${w}주차\n누적 ${col[wi]!.toLocaleString()}명 (이번 주 +${weekly[ci][wi]!.toLocaleString()})`
                            }
                            className="border-b border-grid px-3 py-2 text-right"
                          >
                            {col[wi] === null ? (
                              <span className="text-muted/50">–</span>
                            ) : (
                              <>
                                <span className="font-medium">
                                  {col[wi]!.toLocaleString()}
                                </span>
                                <span className="ml-1.5 text-xs text-muted">
                                  +{weekly[ci][wi]!.toLocaleString()}
                                </span>
                              </>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CrossTable>
            <p className="text-xs text-muted">
              큰 숫자는 누적 인원, 옆의 +숫자는 그 주차에 새로 늘어난
              인원이에요. – 는 그 개강에 해당 주차 데이터가 없다는 뜻이고,{" "}
              {metric === "find"
                ? "찾기 주차(B열)가 빈 행은 세지 않아요."
                : metric === "sangdam"
                  ? "비상 탭 주차(A열)가 43년 형식인 행만 세요."
                  : "육따기 탭 개강월(A열)이 43년인 행만, 주차는 B열로 세요. 인도·교육 등 역할마다 한 줄씩이라 한 줄 = 0.5명이에요."}
            </p>
          </>
        )}
      </CaptureArea>
    </main>
  );
}
