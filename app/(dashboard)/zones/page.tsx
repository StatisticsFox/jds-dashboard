import { CaptureArea } from "@/components/CaptureArea";
import { Chip, ChipRow } from "@/components/Chip";
import { selectCourseWeek } from "@/components/CourseWeekPicker";
import { PageHeader } from "@/components/PageHeader";
import { PendingLink } from "@/components/Pending";
import { RefreshBar } from "@/components/RefreshBar";
import { TeamChipRow } from "@/components/TeamChips";
import { preferredCourse } from "@/lib/course-pref";
import { requireUser } from "@/lib/dal";
import { dataFetchedAt } from "@/lib/data-time";
import { formatCount } from "@/lib/format";
import { pickTeam } from "@/lib/teams";
import { getZoneData, rankOf, sumWeeks, ZONE_METRIC_KEYS, ZONE_METRICS, type ZoneCounts, type ZoneMetric } from "@/lib/zones";

type Unit = "week" | "month";
const isMetric = (v: unknown): v is ZoneMetric => typeof v === "string" && v in ZONE_METRICS;
const ZERO: ZoneCounts = { tachat: 0, sangye: 0, sangdam: 0, yuk: 0 };

// 1~3위 표시 색
const MEDAL = ["bg-[#f5c542] text-[#3d2e00]", "bg-[#c9d1d9] text-[#1f2a33]", "bg-[#e0a370] text-[#3a1f08]"];

export default async function ZonesPage({ searchParams }: PageProps<"/zones">) {
  await requireUser();
  const params = await searchParams;
  const { months, zones } = await getZoneData();

  // 주간(?u=week, 기본) / 월간(?u=month) · 월(?c=43-9) · 주차(?w=8) · 순위 기준(?m=tachat) · 팀(?t=3)
  const unit: Unit = params.u === "month" ? "month" : "week";
  const { course: month, weeks, week } = selectCourseWeek(months, params, await preferredCourse());
  const weekNo = typeof week === "number" ? week : weeks.at(-1);
  const metric: ZoneMetric = isMetric(params.m) ? params.m : "tachat";
  const { team, teamLabel } = pickTeam(params);

  const counts = month ? (unit === "month" ? sumWeeks(month.weeks.values()) : (month.weeks.get(weekNo!) ?? new Map<string, ZoneCounts>())) : new Map<string, ZoneCounts>();
  const valueOf = (zone: string, k: ZoneMetric) => (counts.get(zone) ?? ZERO)[k];
  // 순위는 지역 전체 구역 기준 (팀을 골라도 지역 순위 그대로)
  const ranks = Object.fromEntries(ZONE_METRIC_KEYS.map((k) => [k, rankOf(new Map(zones.map((z) => [z, valueOf(z, k)])))])) as Record<ZoneMetric, Map<string, number>>;

  const shown = zones.filter((z) => !team || z.startsWith(`${team}-`));
  const rows = [...shown].sort((a, b) => valueOf(b, metric) - valueOf(a, metric));
  const max = Math.max(1, ...zones.map((z) => valueOf(z, metric)));
  const totals = Object.fromEntries(ZONE_METRIC_KEYS.map((k) => [k, shown.reduce((s, z) => s + valueOf(z, k), 0)])) as ZoneCounts;

  const periodLabel = month ? (unit === "month" ? `${month.label} 월간` : `${month.label} ${weekNo}주차`) : "";
  const teamSuffix = team ? ` · ${teamLabel}` : "";

  // 칩 주소: 지금 선택을 유지하고 일부만 바꿈 (기본값·전체 팀은 주소에서 뺌)
  const href = (next: { u?: Unit; c?: string; w?: number; m?: ZoneMetric; t?: number | null }) => {
    const q = { u: unit, c: month?.id, w: weekNo, m: metric, t: team as number | null | undefined, ...next };
    return {
      query: {
        ...(q.u === "month" && { u: "month" }),
        c: q.c,
        ...(q.u === "week" && q.w !== undefined && { w: q.w }),
        ...(q.m !== "tachat" && { m: q.m }),
        ...(q.t && { t: q.t }),
      },
    };
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="구역별 순위"
        description={<>주간·월간으로 구역마다 타찾·상예·상담·따기 수와 지역 순위를 봐요</>}
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      <section className="card space-y-3 p-5">
        <ChipRow label="기간">
          <Chip href={href({ u: "week" })} active={unit === "week"}>
            주간
          </Chip>
          <Chip href={href({ u: "month" })} active={unit === "month"}>
            월간
          </Chip>
        </ChipRow>
        <ChipRow label={`${month?.id.split("-")[0] ?? ""}년 월`} className="border-t border-grid pt-3">
          {months.map((m) => (
            <Chip key={m.id} href={href({ c: m.id, w: weekNo !== undefined && m.weeks.has(weekNo) ? weekNo : undefined })} active={m.id === month?.id}>
              {m.label}
            </Chip>
          ))}
        </ChipRow>
        {unit === "week" && (
          <ChipRow label="주차" className="border-t border-grid pt-3">
            {weeks.map((w) => (
              <Chip key={w} href={href({ w })} active={w === weekNo}>
                {w}주차
              </Chip>
            ))}
          </ChipRow>
        )}
        <TeamChipRow team={team} href={(t) => href({ t: t ?? null })} />
        <ChipRow label="순위 기준" className="border-t border-grid pt-3">
          {ZONE_METRIC_KEYS.map((k) => (
            <Chip key={k} href={href({ m: k })} active={k === metric}>
              {ZONE_METRICS[k]}
            </Chip>
          ))}
        </ChipRow>
      </section>

      {/* 지표별 1위 구역 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ZONE_METRIC_KEYS.map((k) => {
          const best = Math.max(0, ...zones.map((z) => valueOf(z, k)));
          const winners = best > 0 ? zones.filter((z) => valueOf(z, k) === best) : [];
          return (
            <PendingLink key={k} href={href({ m: k })} className={`card block p-4 transition-colors hover:border-accent ${k === metric ? "border-accent" : ""}`}>
              <div className="text-xs text-muted">{ZONE_METRICS[k]} 1위 (지역)</div>
              <div className="mt-1 truncate font-cute text-2xl tabular-nums" title={winners.join(", ")}>
                {winners.length ? winners.join(" · ") : "–"}
              </div>
              <div className="mt-0.5 text-xs text-muted">{best > 0 ? `${formatCount(best)}명` : "기록 없음"}</div>
            </PendingLink>
          );
        })}
      </section>

      <CaptureArea
        className="card space-y-4 p-5"
        fileName={`구역별순위_${periodLabel}_${ZONE_METRICS[metric]}${team ? `_${teamLabel}` : ""}`.replace(/\s/g, "")}
        caption={`새빛지역${teamSuffix} · 43년 ${periodLabel} · 구역별 ${ZONE_METRICS[metric]} 순위`}
      >
        <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
          {periodLabel}
          {teamSuffix} · {ZONE_METRICS[metric]} 순위
          <span className="text-xs font-normal text-muted">열 이름을 누르면 그 기준으로 정렬돼요 · 작은 숫자는 지역 {zones.length}개 구역 중 순위</span>
        </h2>

        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[620px] text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="w-14 py-2 text-left font-medium">순위</th>
                <th className="w-20 py-2 text-left font-medium">구역</th>
                {ZONE_METRIC_KEYS.map((k) => (
                  <th key={k} className={`py-2 text-right font-medium ${k === metric ? "w-[34%]" : ""}`}>
                    <PendingLink href={href({ m: k })} className={`rounded px-1 hover:text-foreground ${k === metric ? "font-semibold text-accent-strong" : ""}`}>
                      {ZONE_METRICS[k]}
                      {k === metric && " ▼"}
                    </PendingLink>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((z) => {
                const rank = ranks[metric].get(z)!;
                const v = valueOf(z, metric);
                return (
                  <tr key={z} className="border-b border-grid last:border-0 hover:bg-accent-soft/40">
                    <td className="py-2">
                      <span
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold ${
                          v > 0 && rank <= 3 ? MEDAL[rank - 1] : "text-muted"
                        }`}
                      >
                        {v > 0 ? rank : "–"}
                      </span>
                    </td>
                    <td className="py-2 font-semibold">{z}</td>
                    {ZONE_METRIC_KEYS.map((k) => {
                      const n = valueOf(z, k);
                      if (k === metric) {
                        return (
                          <td key={k} className="py-2 pl-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-grid">
                                <div className="h-full rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
                              </div>
                              <span className="w-10 text-right font-semibold">{formatCount(n)}</span>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={k} className={`py-2 text-right ${n ? "" : "text-muted"}`}>
                          {formatCount(n)}
                          <span className="ml-1 inline-block w-8 text-left text-[11px] text-muted">{n ? `${ranks[k].get(z)}위` : ""}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-muted">
                <td className="pt-2" />
                <td className="pt-2 font-medium">{team ? `${teamLabel} 합계` : "지역 합계"}</td>
                {ZONE_METRIC_KEYS.map((k) => (
                  <td key={k} className={`pt-2 text-right ${k === metric ? "font-semibold text-foreground" : ""}`}>
                    {formatCount(totals[k])}
                    {k !== metric && <span className="ml-1 inline-block w-8" />}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-xs text-muted">
          타찾은 찾기 주차(누적추이 계산용 시트), 상담은 비상 주차, 따기는 육따기 컨펌 주차 기준이에요(역할마다 한 줄이라 한 줄 = 0.5명). 상예는 주차 칸이 없어
          열매누적의 입력 날짜를 그 날짜의 찾기·상담 주차로 맞춰 세요(단계가 &lsquo;찾기&rsquo;인 행은 제외). 월간은 주차 이름의 &lsquo;N월&rsquo;이 같은 주차를 모두 더한 값이에요.
        </p>
      </CaptureArea>
    </main>
  );
}
