import { DiffLabel, DivergingBar } from "@/components/DivergingBar";
import { Star } from "@/components/Mascot";
import { COUNT_METRICS, RATE_METRICS, type Summary, type TeamResult } from "@/lib/conversion";
import { formatCount, formatCountDiff, formatRate, formatRateDiff } from "@/lib/format";

const GRID = "grid grid-cols-[6rem_3.75rem_3.75rem_minmax(5rem,1fr)_5.25rem_2.25rem] items-center gap-x-2.5";

// 한 팀의 탭: 시트의 '○팀 전체수치 / 유월율' 블록을 그래프로
export function TeamDetail({ team, summary, teamCount }: { team: TeamResult; summary: Summary; teamCount: number }) {
  const { regionRates, average, countScale, rateScale, countRank, rateRank } = summary;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="유월율" subtitle="지역 유월율 대비">
        <Header columns={["유월율", "우리 팀", "지역", "지역 대비", "", "순위"]} />
        {RATE_METRICS.map((m) => {
          const value = team.rates[m.key];
          const base = regionRates[m.key];
          const diff = value !== null && base !== null ? value - base : null;
          return (
            <Row key={m.key}>
              <span className="font-medium">{m.label}</span>
              <span className="text-right font-cute text-xl">{formatRate(value)}</span>
              <span className="text-right text-muted">{formatRate(base)}</span>
              <DivergingBar diff={diff} scale={rateScale[m.key]} />
              <span className="text-right">
                <DiffLabel diff={diff} text={diff === null ? "" : formatRateDiff(diff)} />
              </span>
              <Rank rank={rateRank[m.key].get(team.id)} total={teamCount} />
            </Row>
          );
        })}
      </Card>

      <Card title="수치" subtitle="팀 평균 달성 개수 대비">
        <Header columns={["수치", "우리 팀", "팀 평균", "팀 평균 대비", "", "순위"]} />
        {COUNT_METRICS.map((m) => {
          const diff = team.counts[m.key] - average[m.key];
          return (
            <Row key={m.key}>
              <span className="font-medium" title={m.hint}>
                {m.label}
              </span>
              <span className="text-right font-cute text-xl">{formatCount(team.counts[m.key])}</span>
              <span className="text-right text-muted">{formatCount(Math.round(average[m.key] * 10) / 10)}</span>
              <DivergingBar diff={diff} scale={countScale[m.key]} />
              <span className="text-right">
                <DiffLabel diff={diff} text={formatCountDiff(diff)} />
              </span>
              <Rank rank={countRank[m.key].get(team.id)} total={teamCount} />
            </Row>
          );
        })}
      </Card>

      <p className="text-xs text-muted lg:col-span-2">
        막대 길이는 같은 지표 안에서 7개 팀 중 차이가 가장 큰 팀을 끝으로 맞춘 값이라, 다른 팀 탭과 길이를 그대로 비교할 수 있어요.
      </p>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="flex items-center gap-2 text-xl">
        <Star size={20} />
        {title} <span className="font-sans text-sm text-muted">{subtitle}</span>
      </h3>
      <div className="-mx-5 mt-4 overflow-x-auto px-5">
        <div className="min-w-[480px] space-y-1 text-sm tabular-nums">{children}</div>
      </div>
    </section>
  );
}

function Header({ columns }: { columns: string[] }) {
  return (
    <div className={`${GRID} border-b border-grid pb-2 text-xs text-muted`}>
      {columns.map((c, i) => (
        <span key={i} className={i === 0 || i === 3 ? (i === 3 ? "text-center" : "") : "text-right"}>
          {c}
        </span>
      ))}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className={`${GRID} rounded-xl py-2 hover:bg-accent-soft/60`}>{children}</div>;
}

function Rank({ rank, total }: { rank: number | undefined; total: number }) {
  return (
    <span className="text-right text-xs text-muted">
      {rank ? (
        <>
          <span className="font-semibold text-foreground">{rank}</span>/{total}
        </>
      ) : (
        "–"
      )}
    </span>
  );
}
