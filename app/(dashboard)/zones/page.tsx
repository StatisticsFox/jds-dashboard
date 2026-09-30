import { CaptureArea } from "@/components/CaptureArea";
import { Chip } from "@/components/Chip";
import { PageHeader } from "@/components/PageHeader";
import { RefreshBar } from "@/components/RefreshBar";
import { TeamChipRow } from "@/components/TeamChips";
import { koreanDate } from "@/lib/access-log";
import { requireUser } from "@/lib/dal";
import { dataFetchedAt } from "@/lib/data-time";
import { pickTeam } from "@/lib/teams";
import { countByZone, getZoneData, rankOf, toSerial } from "@/lib/zones";

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const MEDALS = ["🥇", "🥈", "🥉"];

// "2026-09-21" → "9. 21."
const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}. ${d}.`;
};

export default async function ZonesPage({ searchParams }: PageProps<"/zones">) {
  await requireUser();
  const params = await searchParams;
  const { tachat, sangye, zones } = await getZoneData();

  // 기간(?s=2026-09-21&e=2026-09-27, 기본 최근 7일) · 팀(?t=3) · 타찾 종류(?k=real 실질, 기본 전체)
  let start = isDate(params.s) ? params.s : koreanDate(6);
  let end = isDate(params.e) ? params.e : koreanDate();
  if (start > end) [start, end] = [end, start];
  const { team, teamLabel } = pickTeam(params);
  const real = params.k === "real";

  const from = toSerial(start);
  const to = toSerial(end);
  const tachatCounts = countByZone(real ? tachat.filter((r) => r.real) : tachat, zones, from, to);
  const sangyeCounts = countByZone(sangye, zones, from, to);

  const period = `${start.replaceAll("-", ". ")}. ~ ${shortDate(end)}`;
  const teamSuffix = team ? ` · ${teamLabel}` : "";
  const query = (next: { t?: number | null; k?: "all" | "real" }) => {
    const t = next.t === undefined ? team : next.t;
    const k = next.k ?? (real ? "real" : "all");
    return { query: { s: start, e: end, ...(t && { t }), ...(k === "real" && { k }) } };
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="타찾·상예 구역별 순위"
        description={<>기간과 팀을 골라 구역마다 타찾·상예 수와 지역 순위를 봐요</>}
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      <section className="card space-y-3 p-5">
        {/* 제출하면 ?s=…&e=… 주소로 이동 (팀·타찾 종류는 그대로) */}
        <form className="flex flex-wrap items-end gap-x-4 gap-y-3 text-sm">
          {team && <input type="hidden" name="t" value={team} />}
          {real && <input type="hidden" name="k" value="real" />}
          <fieldset>
            <legend className="mb-1.5 font-medium">기간</legend>
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" name="s" defaultValue={start} aria-label="시작 날짜" className="field px-2.5 py-1.5" />
              <span className="text-muted">~</span>
              <input type="date" name="e" defaultValue={end} aria-label="마지막 날짜" className="field px-2.5 py-1.5" />
            </div>
          </fieldset>
          <button className="btn-primary px-5 py-2">적용하기</button>
        </form>
        <TeamChipRow team={team} href={(t) => query({ t: t ?? null })} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankCard
          title={`타찾 순위${real ? " (실질)" : " (전체)"}`}
          note={real ? "정파만남이 아닌 타찾만 · 타찾 보고 날짜 기준" : "정파만남 포함 모든 타찾 · 타찾 보고 날짜 기준"}
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
          counts={tachatCounts}
          team={team}
          fileName={`타찾${real ? "실질" : ""}_구역순위_${start}_${end}${team ? `_${teamLabel}` : ""}`}
          caption={`새빛지역${teamSuffix} · ${period} · 구역별 타찾${real ? " 실질" : ""} 순위`}
        />
        <RankCard
          title="상예 순위"
          note="상담 예정 이상 열매 · 열매누적 입력 날짜 · 인도 팀-구역 기준"
          counts={sangyeCounts}
          team={team}
          fileName={`상예_구역순위_${start}_${end}${team ? `_${teamLabel}` : ""}`}
          caption={`새빛지역${teamSuffix} · ${period} · 구역별 상예 순위`}
        />
      </div>

      <p className="text-xs text-muted">
        순위는 팀을 골라도 지역 전체 {zones.length}개 구역 중 순위예요. 같은 수는 같은 순위이고, 1~3위에는 메달이 붙어요. 기간은 시작·마지막 날짜를 모두 포함해요.
      </p>
    </main>
  );
}

// 지표 하나의 구역 순위 카드: 메달·순위 · 구역 · 막대 · 수
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
  const ranks = rankOf(counts);
  const max = Math.max(1, ...counts.values());
  const zones = [...counts.keys()].filter((z) => !team || z.startsWith(`${team}-`));
  const rows = zones.sort((a, b) => counts.get(b)! - counts.get(a)!);
  const total = rows.reduce((s, z) => s + counts.get(z)!, 0);

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

      <ol className="space-y-0.5 text-sm tabular-nums">
        {rows.map((z) => {
          const n = counts.get(z)!;
          const rank = ranks.get(z)!;
          return (
            <li key={z} className="grid grid-cols-[2.5rem_3rem_1fr_2.5rem] items-center gap-2 rounded-md px-1 py-1.5 hover:bg-accent-soft/40">
              <span className="text-center">
                {n > 0 && rank <= 3 ? (
                  <span className="text-xl leading-none" role="img" aria-label={`${rank}위`}>
                    {MEDALS[rank - 1]}
                  </span>
                ) : (
                  <span className="text-xs text-muted">{n > 0 ? `${rank}위` : "–"}</span>
                )}
              </span>
              <span className="font-semibold">{z}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-grid">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span className={`text-right font-semibold ${n ? "" : "text-muted"}`}>{n}</span>
            </li>
          );
        })}
      </ol>

      <div className="flex justify-between border-t border-border px-1 pt-2 text-sm text-muted">
        <span>{team ? `${team}팀 합계` : "지역 합계"}</span>
        <span className="font-semibold text-foreground tabular-nums">{total}명</span>
      </div>
    </CaptureArea>
  );
}
