import { CaptureArea } from "@/components/CaptureArea";
import { Chip, ChipRow } from "@/components/Chip";
import { PageHeader } from "@/components/PageHeader";
import { RefreshBar } from "@/components/RefreshBar";
import { TeamChipRow } from "@/components/TeamChips";
import { requireUser } from "@/lib/dal";
import { dataFetchedAt } from "@/lib/data-time";
import { pickTeam } from "@/lib/teams";
import { countByZone, getZoneData, groupByValue } from "@/lib/zones";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function ZonesPage({ searchParams }: PageProps<"/zones">) {
  await requireUser();
  const params = await searchParams;
  const { tachat, sangye, zones, months } = await getZoneData();

  // 월(?c=43-9) → 주차(?w=8, 없거나 all이면 그 월 전체) · 팀(?t=3) · 타찾 종류(?k=real 실질, 기본 전체)
  // 월을 고르기 전에는 주차를 고를 수 없음
  const month = months.find((m) => m.id === params.c);
  const week: number | "all" = month && month.weeks.some((w) => String(w) === params.w) ? Number(params.w) : "all";
  const { team, teamLabel } = pickTeam(params);
  const real = params.k === "real";

  const query = (next: { c?: string; w?: number | "all"; t?: number | null; k?: "all" | "real" }) => {
    const c = next.c ?? month?.id;
    const w = next.w ?? week;
    const t = next.t === undefined ? team : next.t;
    const k = next.k ?? (real ? "real" : "all");
    return { query: { ...(c && { c }), ...(c && w !== "all" && { w }), ...(t && { t }), ...(k === "real" && { k }) } };
  };

  const period = month ? `43년 ${month.label} ${week === "all" ? "전체" : `${week}주차`}` : "";
  const teamSuffix = team ? ` · ${teamLabel}` : "";
  const fileTail = `${month?.label ?? ""}_${week === "all" ? "전체" : `${week}주차`}${team ? `_${teamLabel}` : ""}`;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="타찾·상예 구역별 순위"
        description={<>월과 주차를 골라 구역마다 타찾·상예 수와 순위를 봐요</>}
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      <section className="card space-y-3 p-5">
        <ChipRow label="43년 월">
          {months.map((m) => (
            // 월을 바꾸면 주차는 그 월 전체부터
            <Chip key={m.id} href={query({ c: m.id, w: "all" })} active={m.id === month?.id}>
              {m.label}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow label="주차" className="border-t border-grid pt-3">
          {month ? (
            <>
              <Chip href={query({ w: "all" })} active={week === "all"}>
                {month.label} 전체
              </Chip>
              {month.weeks.map((w) => (
                <Chip key={w} href={query({ w })} active={week === w}>
                  {w}주차
                </Chip>
              ))}
            </>
          ) : (
            <>
              {["전체", "10주차", "9주차", "8주차", "7주차", "6주차"].map((w) => (
                <Chip key={w} href={{}} disabled title="월을 먼저 골라 주세요">
                  {w}
                </Chip>
              ))}
              <span className="text-xs text-muted">월을 먼저 골라 주세요</span>
            </>
          )}
        </ChipRow>
        <TeamChipRow team={team} href={(t) => query({ t: t ?? null })} />
      </section>

      {!month ? (
        <p className="card py-16 text-center text-sm text-muted">위에서 월을 골라 주세요. 월을 고르면 그 월의 주차가 나타나요.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <RankCard
            title={`타찾 순위${real ? " (실질)" : " (전체)"}`}
            note={real ? "정파만남이 아닌 타찾만 · 찾기 주차 기준" : "정파만남 포함 모든 타찾 · 찾기 주차 기준"}
            toggle={
              <>
                <Chip href={query({ k: "all" })} active={!real}>
                  전체
                </Chip>
                <Chip href={query({ k: "real" })} active={real}>
                  실질
                </Chip>
              </>
            }
            counts={countByZone(real ? tachat.filter((r) => r.real) : tachat, zones, month.id, week)}
            team={team}
            fileName={`타찾${real ? "실질" : ""}_구역순위_${fileTail}`}
            caption={`새빛지역${teamSuffix} · ${period} · 구역별 타찾${real ? " 실질" : ""} 순위`}
          />
          <RankCard
            title="상예 순위"
            note="상담 예정 이상 열매 · 인도 팀-구역 기준 · 입력 날짜를 주차로 맞춤"
            counts={countByZone(sangye, zones, month.id, week)}
            team={team}
            fileName={`상예_구역순위_${fileTail}`}
            caption={`새빛지역${teamSuffix} · ${period} · 구역별 상예 순위`}
          />
        </div>
      )}

      <p className="text-xs text-muted">
        같은 수인 구역은 한 줄로 묶어 같은 순위로 보여주고, 다음 수는 바로 다음 순위예요 (예: 8, 8, 6 → 🥇 두 구역, 🥈). 순위는 지금 보이는 구역끼리 매겨요: 전체 팀이면 지역 {zones.length}개 구역 중, 팀을 고르면 그 팀 구역 중 순위예요.
        상예는 열매누적에 주차 칸이 없어서 입력 날짜를 그 날짜의 찾기·상담 기록에 적힌 주차로 맞춰 세요. 구역은 &lsquo;새빛 목표달성현황표&rsquo; W열의 지금 구역만 보여줘요 (없어진 구역의 기록은 세지 않아요).
      </p>
    </main>
  );
}

// 지표 하나의 구역 순위 카드: 같은 수끼리 한 줄 (메달·순위 · 구역들 · 막대 · 수)
function RankCard({
  title,
  note,
  toggle,
  counts,
  team,
  fileName,
  caption,
}: {
  title: string;
  note: string;
  toggle?: React.ReactNode;
  counts: Map<string, number>;
  team?: number;
  fileName: string;
  caption: string;
}) {
  // 순위·메달·막대 길이는 지금 보이는 구역끼리 (팀을 고르면 그 팀 안에서 다시 매김)
  const shown = new Map([...counts].filter(([z]) => !team || z.startsWith(`${team}-`)));
  const groups = groupByValue(shown);
  const max = Math.max(1, ...shown.values());
  const total = [...shown.values()].reduce((s, n) => s + n, 0);

  return (
    <CaptureArea className="card space-y-4 p-5" fileName={fileName.replace(/\s/g, "")} caption={caption}>
      <div className="space-y-2 pr-36 sm:pr-40">
        <h2 className="text-base">{title}</h2>
        <p className="text-xs text-muted">{note}</p>
        {toggle && (
          <div data-capture-ignore className="flex flex-wrap gap-1.5 pt-1">
            {toggle}
          </div>
        )}
      </div>

      <ol className="space-y-1 text-sm tabular-nums">
        {groups.map((g) => (
          <li key={g.value} className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(4rem,8rem)_2.5rem] items-center gap-2 rounded-md px-1 py-1.5 hover:bg-accent-soft/40">
            <span className="text-center">
              {g.value > 0 && g.rank <= 3 ? (
                <span className="text-xl leading-none" role="img" aria-label={`${g.rank}위`}>
                  {MEDALS[g.rank - 1]}
                </span>
              ) : (
                <span className="text-xs text-muted">{g.value > 0 ? `${g.rank}위` : "–"}</span>
              )}
            </span>
            <span className="flex flex-wrap gap-1">
              {g.zones.map((z) => (
                <span key={z} className={`rounded border px-1.5 py-px text-xs font-semibold ${g.value > 0 ? "border-border bg-surface" : "border-transparent text-muted"}`}>
                  {z}
                </span>
              ))}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-grid">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(g.value / max) * 100}%` }} />
            </span>
            <span className={`text-right font-semibold ${g.value ? "" : "text-muted"}`}>{g.value}</span>
          </li>
        ))}
      </ol>

      <div className="flex justify-between border-t border-border px-1 pt-2 text-sm text-muted">
        <span>{team ? `${team}팀 합계` : "지역 합계"}</span>
        <span className="font-semibold text-foreground tabular-nums">{total}명</span>
      </div>
    </CaptureArea>
  );
}
