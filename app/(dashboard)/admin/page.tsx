import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { Chip, ChipRow } from "@/components/Chip";
import { ACTIONS, getLogs, koreanDate } from "@/lib/access-log";
import { getAllowedPeople } from "@/lib/allowlist";
import { requireAdmin } from "@/lib/dal";

export const metadata: Metadata = { title: "관리자 · 접속 기록" };

const PAGE_NAMES: Record<string, string> = { "/": "팀별 유월율", "/trend": "열매 추이", "/channels": "섭외유형", "/drops": "타찾 탈락", "/fruit-drops": "열매 탈락", "/center": "등록 분석", "/goals": "목표 달성", "/admin": "관리자", "/login": "로그인" };
// 보안상 눈여겨볼 행동은 빨간 칩으로
const WARN_ACTIONS = new Set(["로그인 실패", "코드 요청(미등록)"]);
const PAGE_SIZE = 200;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const [logs, people] = await Promise.all([getLogs(5000), getAllowedPeople()]);
  const configured = Boolean(process.env.ACCESS_LOG_SHEET_ID);

  // 한국 날짜 기준 오늘 / 7일 전
  const today = koreanDate();
  const weekAgo = koreanDate(6);
  const views = logs.filter((l) => l.action === "페이지 조회");
  const todayViews = views.filter((l) => l.time.startsWith(today));
  const weekViews = views.filter((l) => l.time.slice(0, 10) >= weekAgo);
  const warnings7d = logs.filter((l) => WARN_ACTIONS.has(l.action) && l.time.slice(0, 10) >= weekAgo);

  // 사람별 마지막 접속 (허용 명단 전원, 기록 없는 사람 포함)
  const nameOf = new Map(people.map((p) => [p.email, p.name]));
  const perPerson = people
    .map((p) => {
      const mine = logs.filter((l) => l.email === p.email);
      const lastVisit = mine.find((l) => l.action === "페이지 조회" || l.action === "로그인");
      return { ...p, last: lastVisit?.time ?? "", device: lastVisit?.device ?? "", week: weekViews.filter((l) => l.email === p.email).length };
    })
    .sort((a, b) => (b.last || "").localeCompare(a.last || ""));

  // 전체 기록 필터 (?who=이메일&action=행동&limit=N)
  const who = typeof params.who === "string" ? params.who : "";
  const action = typeof params.action === "string" ? params.action : "";
  const limit = Math.min(5000, Math.max(PAGE_SIZE, Number(params.limit) || PAGE_SIZE));
  const filtered = logs.filter((l) => (!who || l.email === who) && (!action || l.action === action));
  const shown = filtered.slice(0, limit);
  const filterHref = (next: Record<string, string>) => ({ query: Object.fromEntries(Object.entries({ who, action, ...next }).filter(([, v]) => v)) });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="관리자 · 접속 기록"
        description={<>누가 언제 대시보드에 들어왔는지 봐요 · 관리자({admin.email})만 볼 수 있어요</>}
      />

      {!configured && (
        <p className="rounded-2xl bg-star/40 px-4 py-3 text-sm">
          ⚠️ 접속 기록 시트(ACCESS_LOG_SHEET_ID)가 아직 설정되지 않아서 기록이 저장되지 않고 있어요.
        </p>
      )}

      {/* 요약 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="오늘 방문한 사람" value={new Set(todayViews.map((l) => l.email)).size} unit="명" />
        <Stat label="오늘 페이지 조회" value={todayViews.length} unit="회" />
        <Stat label="최근 7일 방문한 사람" value={new Set(weekViews.map((l) => l.email)).size} unit="명" sub={`허용 명단 ${people.length}명 중`} />
        <Stat label="최근 7일 주의 기록" value={warnings7d.length} unit="건" sub="로그인 실패 · 미등록 코드 요청" warn={warnings7d.length > 0} />
      </section>

      {/* 사람별 마지막 접속 */}
      <section className="card p-5">
        <h2 className="flex flex-wrap items-baseline gap-x-2 text-base">
          사람별 마지막 접속 <span className="text-xs font-normal text-muted">허용 명단 전체</span>
        </h2>
        <div className="-mx-5 mt-4 overflow-x-auto px-5">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-xs text-muted">
                {["이름", "이메일", "마지막 접속", "최근 7일 조회", "마지막 기기"].map((h, i) => (
                  <th key={h} className={`border-b border-border py-2 pr-3 font-medium ${i === 3 ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perPerson.map((p) => (
                <tr key={p.email} className="hover:bg-accent-soft/50">
                  <td className="border-b border-grid py-2 pr-3 font-medium">
                    <Link href={filterHref({ who: p.email })} scroll={false} className="hover:underline">
                      {p.name || "(이름 없음)"}
                    </Link>
                  </td>
                  <td className="border-b border-grid py-2 pr-3 text-muted">{p.email}</td>
                  <td className="border-b border-grid py-2 pr-3 tabular-nums">{p.last || <span className="text-muted/60">기록 없음</span>}</td>
                  <td className="border-b border-grid py-2 pr-3 text-right tabular-nums">{p.week}</td>
                  <td className="border-b border-grid py-2 pr-3 text-xs text-muted">{p.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 전체 기록 */}
      <section className="card space-y-4 p-5">
        <h2 className="flex flex-wrap items-baseline gap-x-2 text-base">
          전체 기록 <span className="text-xs font-normal text-muted">최신순 · {filtered.length.toLocaleString()}건</span>
        </h2>

        <ChipRow label="행동">
          {["", ...ACTIONS].map((a) => (
            <Chip key={a || "all"} href={filterHref({ action: a })} active={action === a}>
              {a || "전체"}
            </Chip>
          ))}
          {who && (
            <Chip href={filterHref({ who: "" })} active title="이 사람 필터 해제">
              {nameOf.get(who) || who} ✕
            </Chip>
          )}
        </ChipRow>

        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-xs text-muted">
                {["시간", "이름", "이메일", "행동", "페이지", "기기", "IP"].map((h) => (
                  <th key={h} className="border-b border-border py-2 pr-3 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((l, i) => (
                <tr key={`${l.time}-${i}`} className="hover:bg-accent-soft/50">
                  <td className="whitespace-nowrap border-b border-grid py-1.5 pr-3 tabular-nums">{l.time}</td>
                  <td className="whitespace-nowrap border-b border-grid py-1.5 pr-3">{l.name || nameOf.get(l.email) || "–"}</td>
                  <td className="border-b border-grid py-1.5 pr-3 text-muted">{l.email}</td>
                  <td className="whitespace-nowrap border-b border-grid py-1.5 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${WARN_ACTIONS.has(l.action) ? "bg-bad/15 font-semibold text-bad" : "bg-accent-soft text-accent-strong"}`}>
                      {WARN_ACTIONS.has(l.action) && "⚠ "}
                      {l.action}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-grid py-1.5 pr-3">{PAGE_NAMES[l.path] ?? l.path}</td>
                  <td className="whitespace-nowrap border-b border-grid py-1.5 pr-3 text-xs text-muted">{l.device}</td>
                  <td className="border-b border-grid py-1.5 pr-3 font-mono text-xs text-muted">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="py-10 text-center text-sm text-muted">기록이 없어요.</p>}
        </div>
        {filtered.length > shown.length && (
          <Link href={{ query: { ...filterHref({}).query, limit: limit + PAGE_SIZE } }} scroll={false} className="block text-center text-sm text-muted hover:text-foreground">
            더 보기 ({shown.length.toLocaleString()} / {filtered.length.toLocaleString()})
          </Link>
        )}
        <p className="text-xs text-muted">
          같은 사람이 같은 페이지를 5분 안에 다시 보면(필터를 바꾸는 등) 한 번만 기록해요. 시간은 한국 시간이에요.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value, unit, sub, warn }: { label: string; value: number; unit: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`card p-4 ${warn ? "ring-2 ring-bad/40" : ""}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-cute text-3xl tabular-nums ${warn ? "text-bad" : ""}`}>
        {value.toLocaleString()}
        <span className="ml-0.5 text-base">{unit}</span>
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
