import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { ColumnChart } from "@/components/ColumnChart";
import { countByMonth, countByTeam, dateBounds, filterByDate } from "@/lib/metrics";
import { requireUser } from "@/lib/dal";
import { getFruits, STAGES, type Stage } from "@/lib/sheets";

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isStage = (v: unknown): v is Stage => typeof v === "string" && v in STAGES;

// 마지막 날짜가 속한 달을 포함해 최근 12개월의 첫날
function twelveMonthsBefore(date: string) {
  const [y, m] = date.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 12, 1));
  return start.toISOString().slice(0, 10);
}

export default async function Home({ searchParams }: PageProps<"/">) {
  await requireUser();
  const params = await searchParams;
  const stage = isStage(params.stage) ? params.stage : "tachat";
  const config = STAGES[stage];
  const fruits = await getFruits(stage);
  const bounds = dateBounds(fruits);

  // 기간을 지정하지 않으면 데이터의 최근 12개월
  let from = isDate(params.from) ? params.from : twelveMonthsBefore(bounds.max!);
  let to = isDate(params.to) ? params.to : bounds.max!;
  if (from > to) [from, to] = [to, from];

  const inRange = filterByDate(fruits, from, to);
  const monthly = countByMonth(inRange, from, to);
  const teams = countByTeam(inRange);
  const noDate = fruits.filter((f) => f.date === null).length;
  const noTeam = teams.find((t) => t.label === "미지정")?.count ?? 0;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">열매 대시보드</h1>
          <p className="mt-1 text-sm text-muted">
            {config.dateColumn} 기준 · 탈락 포함 · 데이터 기간 {bounds.min} ~ {bounds.max}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 열매 단계 선택: 기간은 그대로 유지 */}
          <nav className="flex rounded-lg border border-border bg-surface p-1 text-sm">
            {(Object.keys(STAGES) as Stage[]).map((s) => (
              <Link
                key={s}
                href={{ query: { stage: s, ...(isDate(params.from) && { from }), ...(isDate(params.to) && { to }) } }}
                className={`rounded-md px-3 py-1.5 font-medium ${s === stage ? "bg-foreground text-background" : "text-muted"}`}
              >
                {STAGES[s].label}
              </Link>
            ))}
          </nav>

          {/* 기간 선택: 제출하면 ?stage=...&from=...&to=... 주소로 이동 */}
          <form className="flex flex-wrap items-center gap-2 text-sm">
            <input type="hidden" name="stage" value={stage} />
            <input type="date" name="from" defaultValue={from} className="rounded-md border border-border bg-surface px-2 py-1.5" />
            <span className="text-muted">~</span>
            <input type="date" name="to" defaultValue={to} className="rounded-md border border-border bg-surface px-2 py-1.5" />
            <button className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background">적용</button>
            <Link href={{ query: { stage } }} className="px-1 text-muted underline-offset-2 hover:underline">
              최근 12개월
            </Link>
          </form>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label={`기간 내 ${config.label} 열매`} value={`${inRange.length.toLocaleString()}개`} hero />
        <Stat label="월 평균" value={`${Math.round(inRange.length / monthly.length).toLocaleString()}개`} />
        <Stat label="조회 기간" value={`${monthly.length}개월`} sub={`${from} ~ ${to}`} />
      </section>

      <Card title={`월별 ${config.label} 열매 수 추이`}>
        <ColumnChart data={monthly} />
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted">표로 보기</summary>
          <table className="mt-2 w-full max-w-xs tabular-nums">
            <tbody>
              {monthly.map((m) => (
                <tr key={m.label} className="border-b border-grid">
                  <td className="py-1 text-muted">{m.label}</td>
                  <td className="py-1 text-right">{m.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

      <Card title={`인도 팀별 ${config.label} 열매 수`}>
        <BarChart data={teams} />
      </Card>

      <div className="space-y-1 text-xs text-muted">
        {noDate > 0 && <p>※ {config.dateColumn}가 비어 있는 열매 {noDate}개는 기간 집계에서 빠졌습니다.</p>}
        {noTeam > 0 && <p>※ 미지정: {config.teamColumn}이 &apos;0-0&apos; 형식이 아닌 열매 {noTeam}개</p>}
      </div>
    </main>
  );
}

function Stat({ label, value, sub, hero }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 font-bold ${hero ? "text-4xl" : "text-2xl"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
