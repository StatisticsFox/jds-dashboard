import { CaptureArea } from "@/components/CaptureArea";
import { Chip, ChipRow } from "@/components/Chip";
import { FunnelBars } from "@/components/FunnelBars";
import { PageHeader } from "@/components/PageHeader";
import { RefreshBar } from "@/components/RefreshBar";
import { preferredCourse } from "@/lib/course-pref";
import { requireUser } from "@/lib/dal";
import { dataFetchedAt } from "@/lib/data-time";
import { formatCount, formatRate, formatRateDiff } from "@/lib/format";
import { getOtStats, type OtStats } from "@/lib/ot-stats";
import { getRegionConversion, type CourseConversion } from "@/lib/region-conversion";

// 개강 하나의 단계별 인원 (지역 전체)
// 타찾·상예·상담·따기: 유월율 파일 (팀별 유월율 탭과 같은 계산, 타찾은 실질, 따기 = 육따기 누적)
// 전→복 이관·OT·센터등록: '43년 센터등록 명단 및 유월율' 파일 (이관 = 육따기 최대 수치)
//   육따기 열매는 전도 파트에서 복음방 파트로 넘어가는데, 넘어간 뒤 복음방 파트에서 올리지 않는 열매가 있어 따기보다 줄어듦
type Funnel = { tachat: number; sangye: number; sangdam: number; yuk: number; transfer: number | null; ot: number | null; center: number | null };

function funnelOf(c: CourseConversion, ot: OtStats | undefined): Funnel {
  return {
    tachat: c.counts.tachatReal,
    sangye: c.counts.sangye,
    sangdam: c.counts.sangdam,
    yuk: c.counts.yukCum,
    transfer: ot?.yukMax ?? null,
    ot: ot?.ot ?? null,
    center: ot?.center ?? null,
  };
}

const RATES: { key: string; label: string; from: keyof Funnel; to: keyof Funnel; fromLabel: string; toLabel: string }[] = [
  { key: "tachatSangye", label: "타찾 → 상예", from: "tachat", to: "sangye", fromLabel: "타찾", toLabel: "상예" },
  { key: "sangyeSangdam", label: "상예 → 상담", from: "sangye", to: "sangdam", fromLabel: "상예", toLabel: "상담" },
  { key: "sangdamYuk", label: "상담 → 따기", from: "sangdam", to: "yuk", fromLabel: "상담", toLabel: "따기" },
  { key: "yukTransfer", label: "따기 → 전→복 이관", from: "yuk", to: "transfer", fromLabel: "따기", toLabel: "이관" },
  { key: "transferOt", label: "이관 → OT", from: "transfer", to: "ot", fromLabel: "이관", toLabel: "OT" },
  { key: "otCenter", label: "OT → 센터등록", from: "ot", to: "center", fromLabel: "OT", toLabel: "센터등록" },
];
const rateOf = (f: Funnel, from: keyof Funnel, to: keyof Funnel) => {
  const a = f[from] as number | null;
  const b = f[to] as number | null;
  return a && b !== null ? b / a : null;
};

export default async function RegionCourseDetailPage({ searchParams }: PageProps<"/region-conversion/course">) {
  await requireUser();
  const params = await searchParams;
  const [courses, otStats] = await Promise.all([getRegionConversion(), getOtStats()]);
  const funnels = new Map(courses.map((c) => [c.id, funnelOf(c, otStats.get(c.id))]));

  // 개강 하나 (?c=43-9). 없으면 다른 탭에서 고른 개강, 그것도 없으면 진행 중이 아닌 가장 최근 개강
  const pref = await preferredCourse();
  const course =
    courses.find((c) => c.id === params.c) ?? courses.find((c) => c.id === pref) ?? courses.filter((c) => !c.ongoing).at(-1) ?? courses.at(-1);
  const f = course ? funnels.get(course.id)! : null;

  // 비교 기준: 바로 전 개강 (예: 9월 개강 → 8월 개강). 43년 첫 개강은 비교 대상 없음
  const prev = course ? courses[courses.findIndex((c) => c.id === course.id) - 1] : undefined;
  const prevFunnel = prev ? funnels.get(prev.id)! : null;
  // 43년 평균: 진행 중이 아닌 개강들의 유월율 평균 (그 비율을 계산할 수 있는 개강만)
  const done = courses.filter((c) => !c.ongoing);
  const average = Object.fromEntries(
    RATES.map((r) => {
      const values = done.map((c) => rateOf(funnels.get(c.id)!, r.from, r.to)).filter((v): v is number => v !== null);
      return [r.key, values.length ? values.reduce((a, b) => a + b, 0) / values.length : null];
    }),
  ) as Record<string, number | null>;

  const steps = f
    ? [
        { label: "타찾 (실질)", value: f.tachat, color: "var(--stage-tachat)" },
        { label: "상예", value: f.sangye, color: "var(--stage-sangye)" },
        { label: "상담", value: f.sangdam, color: "var(--stage-sangdam)" },
        { label: "따기", value: f.yuk, color: "var(--stage-yuk)", unit: "" },
        { label: "전→복 이관", value: f.transfer, color: "var(--stage-transfer)", unit: "" },
        { label: "OT", value: f.ot, color: "var(--stage-ot)", unit: "" },
        { label: "센터등록", value: f.center, color: "var(--stage-center)", unit: "" },
      ]
    : [];

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="지역 유월율 · 개강별 세부"
        description="개강 하나를 골라 타찾부터 센터등록까지 단계마다 몇 명이 다음 단계로 넘어갔는지 봐요"
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      <section className="card p-5">
        <ChipRow label="43년 개강">
          {courses.map((c) => (
            <Chip key={c.id} href={{ query: { c: c.id } }} active={c.id === course?.id}>
              {c.label.replace(" 개강", "")}
              {c.ongoing && <span className="text-[10px] font-normal opacity-70">진행 중</span>}
            </Chip>
          ))}
        </ChipRow>
      </section>

      {course && f && (
        <>
          {/* 단계별 유월율 */}
          <CaptureArea className="card space-y-4 p-5" fileName={`지역유월율_${course.label}_단계별`.replace(/\s/g, "")} caption={`새빛지역 · 43년 ${course.label} · 단계별 유월율`}>
            <h2 className="flex flex-wrap items-baseline gap-x-2 pr-36 text-base sm:pr-40">
              {course.label} 단계별 유월율 <span className="text-xs font-normal text-muted">아래 작은 글씨는 {prev ? `바로 전 ${prev.label}` : "(43년 첫 개강이라 전 개강 없음)"}과 43년 평균(진행 중 개강 제외)에 비교한 값</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {RATES.map((r) => {
                const v = rateOf(f, r.from, r.to);
                const before = prevFunnel ? rateOf(prevFunnel, r.from, r.to) : null;
                const diff = v !== null && before !== null ? v - before : null;
                const avg = average[r.key];
                const avgDiff = v !== null && avg !== null ? v - avg : null;
                return (
                  <div key={r.key} className="rounded-lg border border-border p-4">
                    <div className="text-xs text-muted">{r.label}</div>
                    <div className="mt-1 font-cute text-3xl tabular-nums">{formatRate(v)}</div>
                    <div className="mt-1 text-xs text-muted tabular-nums">
                      {v === null
                        ? f[r.to] === null
                          ? `${r.toLabel} 집계 전`
                          : "계산할 수 없어요"
                        : `${r.toLabel} ${formatCount(f[r.to] as number)} ÷ ${r.fromLabel} ${formatCount(f[r.from] as number)}`}
                    </div>
                    {diff !== null && (
                      <div className={`mt-0.5 text-xs font-medium tabular-nums ${diff >= 0 ? "text-good" : "text-bad"}`}>
                        {prev!.label.replace(" 개강", "")} {formatRate(before)} 대비 {formatRateDiff(diff)}
                      </div>
                    )}
                    {avgDiff !== null && (
                      <div className={`mt-0.5 text-xs font-medium tabular-nums ${avgDiff >= 0 ? "text-good" : "text-bad"}`}>
                        평균 {formatRate(avg)} 대비 {formatRateDiff(avgDiff)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CaptureArea>

          {/* 단계별 인원 막대 */}
          <CaptureArea className="card space-y-4 p-5" fileName={`지역유월율_${course.label}_단계별인원`.replace(/\s/g, "")} caption={`새빛지역 · 43년 ${course.label} · 단계별 인원`}>
            <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-36 text-base sm:pr-40">
              {course.label} 단계별 인원 <span className="text-xs font-normal text-muted">막대 위 점을 이은 선은 단계마다 줄어드는 모양 · 숫자 사이 → %는 다음 단계로 넘어간 비율</span>
            </h2>
            <FunnelBars steps={steps} />
            <p className="text-xs text-muted">
              타찾(실질)·상예·상담·따기는 팀별 유월율 탭과 같은 계산이에요 (기간 {course.settings.tachatStart.slice(5).replace("-", ".")}~{course.settings.tachatEnd.slice(5).replace("-", ".")}
              {course.official ? "" : ", 추정 기간"}, 따기 = 육따기 누적). 전→복 이관·OT·센터등록은 &lsquo;43년 센터등록 명단 및 유월율&rsquo; 시트의 육따기 최대 수치·OT·센터등록이에요.
              육따기 열매는 전도 파트에서 복음방 파트로 이관되는데, 이관 뒤 복음방 파트에서 따로 올리지 않는 열매가 있어 따기보다 줄어들어요. 아직 집계 전인 단계는 점선 막대로 표시해요.
            </p>
          </CaptureArea>
        </>
      )}
    </main>
  );
}
