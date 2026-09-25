import Link from "next/link";
import { CaptureArea } from "@/components/CaptureArea";
import { LineChart } from "@/components/LineChart";
import { Mascot, Star } from "@/components/Mascot";
import { requireUser } from "@/lib/dal";
import { getCourses, WEEKLY_METRICS, weeklyTable, type WeeklyMetric } from "@/lib/weekly";

const MAX_SELECTED = 8; // 선 색(범주 팔레트)이 8가지라 동시에 8개까지
const DEFAULT_COUNT = 4;

// 지표 탭 순서
const METRICS: { key: WeeklyMetric; label: string }[] = [
  { key: "find", label: "찾기" },
  { key: "sangdam", label: "상담" },
];
const isMetric = (v: unknown): v is WeeklyMetric => typeof v === "string" && v in WEEKLY_METRICS;

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
  const requested = [params.c ?? []].flat().filter((id) => yearCourses.some((c) => c.id === id));
  const firstVisit = params.c === undefined;
  const selectedIds = new Set(firstVisit ? yearCourses.slice(-DEFAULT_COUNT).map((c) => c.id) : requested.slice(0, MAX_SELECTED));
  const selected = yearCourses.filter((c) => selectedIds.has(c.id));
  const color = (i: number) => `var(--cat-${i + 1})`;

  // 그래프·표는 누적 값. 그 주차에 새로 늘어난 수(weekly)는 툴팁과 표에 작게 함께 표시
  const { weeks, cumulative, weekly } = weeklyTable(selected);
  const series = selected.map((c, i) => ({ id: c.id, label: c.label, color: color(i), values: cumulative[i], deltas: weekly[i] }));

  // 선택이 비면 c를 빈 값으로 남겨서 "선택 없음"을 기억 (없애면 처음 방문처럼 기본값이 다시 선택됨)
  const hrefWith = (ids: string[], m: string = metric) => ({ query: { m, year, c: ids.length ? ids : "" } });
  const toggle = (id: string) =>
    selectedIds.has(id) ? [...selectedIds].filter((x) => x !== id) : [...selectedIds, id];
  const caption = `새빛지역 · ${year}년 · 개강별 동주차 누적 ${metricLabel} 인원 · ${selected.map((c) => c.label).join(", ")}`;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Mascot size={48} />
        <div>
          <h1 className="text-3xl">개강별 동주차 누적 추이</h1>
          <p className="mt-0.5 text-sm text-muted">같은 주차끼리 개강을 비교해요 · 주차는 개강에 가까워지는 순서(큰 수 → 작은 수)로 누적돼요</p>
        </div>
      </header>

      {/* 지표 선택 */}
      <nav className="flex w-max gap-1 rounded-full border border-border bg-surface p-1 text-sm shadow-sm">
        {METRICS.map((m) => (
          <Link
            key={m.key}
            href={hrefWith([...selectedIds], m.key)}
            scroll={false}
            className={`rounded-full px-4 py-1.5 font-medium ${m.key === metric ? "bg-accent text-accent-ink" : "text-muted hover:bg-accent-soft hover:text-foreground"}`}
          >
            {m.label}
          </Link>
        ))}
      </nav>

      {/* 개강 선택 (여러 개 가능) */}
      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl">
            <Star size={20} /> 개강 선택 <span className="font-sans text-sm text-muted">여러 개 고를 수 있어요 (최대 {MAX_SELECTED}개)</span>
          </h2>
          {years.length > 1 && (
            <div className="flex gap-1 text-xs">
              {years.map((y) => (
                <Link
                  key={y}
                  href={hrefWith([...selectedIds].filter((id) => id.startsWith(`${y}-`)))}
                  className={`rounded-full px-3 py-1 ${y === year ? "bg-accent-soft font-semibold text-accent-strong" : "text-muted hover:text-foreground"}`}
                >
                  {y}년
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {yearCourses.map((c) => {
            const on = selectedIds.has(c.id);
            const index = selected.findIndex((s) => s.id === c.id);
            const full = !on && selectedIds.size >= MAX_SELECTED;
            return full ? (
              <span key={c.id} className="rounded-full border border-border px-3 py-1.5 text-sm text-muted/50" title={`최대 ${MAX_SELECTED}개까지 고를 수 있어요`}>
                {c.label}
              </span>
            ) : (
              <Link
                key={c.id}
                href={hrefWith(toggle(c.id))}
                scroll={false}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on ? "border-foreground/20 bg-surface font-semibold shadow-sm" : "border-border text-muted hover:border-accent hover:bg-accent-soft hover:text-foreground"
                }`}
              >
                {on ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(index) }} /> : <span className="text-xs">＋</span>}
                {c.label}
              </Link>
            );
          })}
        </div>
        <div className="flex gap-3 text-xs text-muted">
          <Link href={hrefWith(yearCourses.slice(-DEFAULT_COUNT).map((c) => c.id))} scroll={false} className="hover:text-foreground hover:underline">
            최근 {DEFAULT_COUNT}개
          </Link>
          <Link href={hrefWith(yearCourses.slice(-MAX_SELECTED).map((c) => c.id))} scroll={false} className="hover:text-foreground hover:underline">
            최근 {MAX_SELECTED}개
          </Link>
          <Link href={hrefWith([])} scroll={false} className="hover:text-foreground hover:underline">
            모두 해제
          </Link>
        </div>
      </section>

      <CaptureArea className="card space-y-5 p-5" fileName={`동주차_누적${metricLabel}_${year}년`} caption={caption}>
        <h2 className="flex flex-wrap items-center gap-2 pr-36 text-xl sm:pr-40">
          <Star size={20} /> 동주차 누적 {metricLabel} 인원 <span className="font-sans text-sm text-muted">{year}년 · 첫 주차부터 그 주차까지 합산</span>
        </h2>

        {selected.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">위에서 개강을 하나 이상 골라 주세요.</p>
        ) : (
          <>
            {/* 범례 */}
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {selected.map((c, i) => (
                <li key={c.id} className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full" style={{ background: color(i) }} />
                  {c.label}
                </li>
              ))}
            </ul>

            <div className="-mx-2 overflow-x-auto px-2">
              <div className="min-w-[520px]">
                <LineChart xLabels={weeks.map((w) => `${w}주차`)} series={series} />
              </div>
            </div>

            {/* 표: 행 = 주차, 열 = 개강 */}
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-max border-separate border-spacing-0 text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="sticky left-0 border-b border-border bg-surface py-2 pr-4 text-left font-medium">주차</th>
                    {selected.map((c, i) => (
                      <th key={c.id} className="border-b border-border px-3 py-2 text-right font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: color(i) }} />
                          {c.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w, wi) => (
                    <tr key={w} className="hover:bg-accent-soft/50">
                      <th className="sticky left-0 border-b border-grid bg-surface py-2 pr-4 text-left font-medium">{w}주차</th>
                      {cumulative.map((col, ci) => (
                        <td key={selected[ci].id} className="border-b border-grid px-3 py-2 text-right">
                          {col[wi] === null ? (
                            <span className="text-muted/50">–</span>
                          ) : (
                            <>
                              <span className="font-medium">{col[wi]!.toLocaleString()}</span>
                              <span className="ml-1.5 text-xs text-muted">+{weekly[ci][wi]!.toLocaleString()}</span>
                            </>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">큰 숫자는 누적 인원, 옆의 +숫자는 그 주차에 새로 늘어난 인원이에요. – 는 그 개강에 해당 주차 데이터가 없다는 뜻이고, {metric === "find" ? "찾기 주차(B열)가 빈 행은 세지 않아요." : "비상 탭 주차(A열)가 43년 형식인 행만 세요."}</p>
          </>
        )}
      </CaptureArea>
    </main>
  );
}
