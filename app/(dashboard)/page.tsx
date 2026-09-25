import Link from "next/link";
import { RefreshBar } from "@/components/RefreshBar";
import { dataFetchedAt } from "@/lib/data-time";
import { CaptureArea } from "@/components/CaptureArea";
import { Chip, ChipRow } from "@/components/Chip";
import { MetricCompare } from "@/components/MetricCompare";
import { TeamDetail } from "@/components/TeamDetail";
import { PageHeader } from "@/components/PageHeader";
import { TeamTable } from "@/components/TeamTable";
import { formatCount, formatCountDiff, formatRate, formatRateDiff } from "@/lib/format";
import { preferredCourse } from "@/lib/course-pref";
import { requireUser } from "@/lib/dal";
import { COUNT_METRICS, getConversionData, RATE_METRICS, summarize, TEAMS, toRates, type Settings } from "@/lib/conversion";

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function ConversionPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const params = await searchParams;
  const { defaults, presets, courses, count } = await getConversionData();

  // 주소에 값이 없으면 시트 '팀별 유월율'에 저장된 설정값을 사용
  // 주소에 설정이 하나도 없고, 다른 탭에서 고른 개강의 기간이 '각 개강별 기간'에 있으면 그 개강·기간으로 시작
  const pref = await preferredCourse();
  const [prefYear, prefMonth] = pref?.split("-") ?? [];
  const prefCourse = pref ? `${prefYear}년 ${prefMonth}월` : null;
  const prefPreset = presets.find((p) => p.label === `${prefMonth}월 개강`);
  const noParams = !["ts", "te", "ss", "se", "course"].some((k) => params[k] !== undefined);
  const base: Settings =
    noParams && prefCourse && prefPreset && courses.includes(prefCourse)
      ? { tachatStart: prefPreset.tachatStart, tachatEnd: prefPreset.tachatEnd, sangyeStart: prefPreset.sangyeStart, sangyeEnd: prefPreset.sangyeEnd, course: prefCourse }
      : defaults;
  const settings: Settings = {
    tachatStart: isDate(params.ts) ? params.ts : base.tachatStart,
    tachatEnd: isDate(params.te) ? params.te : base.tachatEnd,
    sangyeStart: isDate(params.ss) ? params.ss : base.sangyeStart,
    sangyeEnd: isDate(params.se) ? params.se : base.sangyeEnd,
    course: typeof params.course === "string" && courses.includes(params.course) ? params.course : base.course,
  };
  // 선택한 탭: "all" 또는 팀 번호
  const tab = TEAMS.find((t) => String(t.id) === params.team)?.id ?? "all";
  const query = { ts: settings.tachatStart, te: settings.tachatEnd, ss: settings.sangyeStart, se: settings.sangyeEnd, course: settings.course };

  const region = count(settings);
  const teams = TEAMS.map((t) => {
    const counts = count(settings, t.id);
    return { ...t, counts, rates: toRates(counts) };
  });
  const summary = summarize(teams, region);
  const { regionRates, average } = summary;
  const selected = teams.find((t) => t.id === tab);
  // 캡처 이미지에 들어갈 설명과 파일 이름
  const caption = `새빛지역 · ${settings.course} 개강 기준 · 타찾 ${settings.tachatStart} ~ ${settings.tachatEnd} · 상예 ${settings.sangyeStart} ~ ${settings.sangyeEnd}`;
  const fileName = (name: string) => `${name}_${settings.course.replace(/\s/g, "")}`;

  const warnings = [
    settings.tachatStart > settings.tachatEnd && "타찾 시작 날짜가 종료 날짜보다 늦어요.",
    settings.sangyeStart > settings.sangyeEnd && "상예 시작 날짜가 종료 날짜보다 늦어요.",
  ].filter((w): w is string => Boolean(w));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        title="팀별 유월율"
        description={`${user.name}님 · 단계별 전환율을 지역·팀 기준으로 비교해요`}
        meta={
          <>
            <span className="rounded-md bg-accent px-2 py-1 font-semibold text-accent-ink">{settings.course} 개강</span>
            <span className="rounded-md border border-border bg-surface px-2 py-1 text-muted">
              타찾 {settings.tachatStart} ~ {settings.tachatEnd}
            </span>
            <span className="rounded-md border border-border bg-surface px-2 py-1 text-muted">
              상예 {settings.sangyeStart} ~ {settings.sangyeEnd}
            </span>
          </>
        }
        right={<RefreshBar at={dataFetchedAt()} />}
      />

      {/* 설정: 제출하면 ?ts=...&te=...&ss=...&se=...&course=... 주소로 이동 */}
      <section className="card p-5">
        <form className="flex flex-wrap items-end gap-x-6 gap-y-4 text-sm">
          {tab !== "all" && <input type="hidden" name="team" value={tab} />}
          <DateRange label="타찾 기간" names={["ts", "te"]} values={[settings.tachatStart, settings.tachatEnd]} />
          <DateRange label="상예 기간" names={["ss", "se"]} values={[settings.sangyeStart, settings.sangyeEnd]} />
          <label className="space-y-1.5">
            <span className="block font-medium">기준 개강</span>
            <select name="course" defaultValue={settings.course} className="field px-3 py-1.5">
              {courses.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button className="btn-primary px-5 py-2">적용하기</button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-grid pt-4 text-xs">
          <span className="mr-1.5 text-xs font-medium text-muted">기간 불러오기</span>
          {presets.map((p) => (
            <Chip
              key={p.label}
              href={{ query: { ...query, ts: p.tachatStart, te: p.tachatEnd, ss: p.sangyeStart, se: p.sangyeEnd, ...(tab !== "all" && { team: tab }) } }}
              active={settings.tachatStart === p.tachatStart && settings.tachatEnd === p.tachatEnd && settings.sangyeStart === p.sangyeStart && settings.sangyeEnd === p.sangyeEnd}
            >
              {p.label}
            </Chip>
          ))}
          <Link
            href={{ query: { ts: defaults.tachatStart, te: defaults.tachatEnd, ss: defaults.sangyeStart, se: defaults.sangyeEnd, course: defaults.course, ...(tab !== "all" && { team: tab }) } }}
            className="ml-auto text-muted underline-offset-2 hover:underline"
          >
            시트 설정값으로 되돌리기
          </Link>
        </div>
        {warnings.map((w) => (
          <p key={w} className="mt-3 rounded-md border border-star-edge/40 bg-star/20 px-3 py-2 text-sm font-medium">
            ⚠️ {w}
          </p>
        ))}
      </section>

      {/* 지역 전체 흐름 */}
      <CaptureArea className="card p-5" fileName={fileName("지역전체")} caption={caption}>
        <SectionTitle>지역 전체</SectionTitle>
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COUNT_METRICS.map((m, i) => {
            const rate = RATE_METRICS.find((r) => r.numerator === m.key && r.key !== "tachatToSangdam");
            return (
              <li key={m.key} className="tile p-3.5" title={m.hint}>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="text-[10px] font-semibold text-muted/70">{String(i + 1).padStart(2, "0")}</span>
                  {m.label}
                </div>
                <div className="mt-1 font-cute text-3xl tabular-nums">{formatCount(region[m.key])}</div>
                <div className="mt-1 h-4 text-xs text-muted">
                  {rate && (
                    <>
                      {rate.key === "yukDefense" ? "방어율" : "전환"}{" "}
                      <span className="font-semibold text-foreground">{formatRate(regionRates[rate.key])}</span>
                    </>
                  )}
                  {m.key === "tachatReal" && region.tachatAll > 0 && `전체의 ${formatRate(region.tachatReal / region.tachatAll)}`}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted">
          타찾 → 상담 <span className="font-semibold text-foreground">{formatRate(regionRates.tachatToSangdam)}</span> · 전환율의 타찾은 모두
          타찾 실질 기준
        </p>
      </CaptureArea>

      {/* 탭: 전체 비교 / 팀별 */}
      <ChipRow label="보기">
        {[{ id: "all" as const, label: "전체 비교", emoji: "" }, ...TEAMS].map((t) => (
          <Chip key={t.id} href={{ query: { ...query, ...(t.id !== "all" && { team: t.id }) } }} active={t.id === tab}>
            {t.emoji} {t.label}
          </Chip>
        ))}
      </ChipRow>

      {selected ? (
        <CaptureArea className="-m-4 space-y-4 p-4" fileName={fileName(`${selected.label}`)} caption={caption}>
          <h2 className="text-lg">
            {selected.emoji} {selected.label}
          </h2>
          <TeamDetail team={selected} summary={summary} teamCount={teams.length} />
        </CaptureArea>
      ) : (
        <>
          <CaptureArea className="card p-5" fileName={fileName("전체_유월율")} caption={caption}>
            <SectionTitle sub="지역 유월율 대비">유월율</SectionTitle>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {RATE_METRICS.map((m) => (
                <MetricCompare
                  key={m.key}
                  title={m.label}
                  baseLabel={`지역 ${formatRate(regionRates[m.key])}`}
                  scale={summary.rateScale[m.key]}
                  rows={teams.map((t) => {
                    const v = t.rates[m.key];
                    const base = regionRates[m.key];
                    const diff = v !== null && base !== null ? v - base : null;
                    return { id: t.id, label: `${t.emoji} ${t.label}`, value: formatRate(v), diff, diffText: diff === null ? "" : formatRateDiff(diff) };
                  })}
                />
              ))}
            </div>
          </CaptureArea>

          <CaptureArea className="card p-5" fileName={fileName("전체_수치")} caption={caption}>
            <SectionTitle sub="팀 평균 달성 인원 대비">수치</SectionTitle>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {COUNT_METRICS.map((m) => (
                <MetricCompare
                  key={m.key}
                  title={m.label}
                  baseLabel={`팀 평균 ${formatCount(Math.round(average[m.key] * 10) / 10)}`}
                  scale={summary.countScale[m.key]}
                  rows={teams.map((t) => {
                    const diff = t.counts[m.key] - average[m.key];
                    return { id: t.id, label: `${t.emoji} ${t.label}`, value: formatCount(t.counts[m.key]), diff, diffText: formatCountDiff(diff) };
                  })}
                />
              ))}
            </div>
          </CaptureArea>

          <CaptureArea className="card p-5" fileName={fileName("전체_상세표")} caption={caption}>
            <SectionTitle>팀별 상세</SectionTitle>
            <p className="mt-1 text-xs text-muted">
              시트와 같은 표 · 칸 색은 높으면 초록, 낮으면 빨강 · 수치는 팀 평균, 유월율은 지역 유월율과 비교
            </p>
            <TeamTable teams={teams} region={region} summary={summary} />
          </CaptureArea>
        </>
      )}
    </main>
  );
}

function DateRange({ label, names, values }: { label: string; names: [string, string]; values: [string, string] }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 font-medium">{label}</legend>
      <div className="flex items-center gap-2">
        <input type="date" name={names[0]} defaultValue={values[0]} className="field px-2.5 py-1.5" />
        <span className="text-muted">~</span>
        <input type="date" name={names[1]} defaultValue={values[1]} className="field px-2.5 py-1.5" />
      </div>
    </fieldset>
  );
}

// 카드 제목 + 보조 설명
function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <h2 className="flex flex-wrap items-baseline gap-x-2 text-base">
      {children}
      {sub && <span className="text-xs font-normal text-muted">{sub}</span>}
    </h2>
  );
}
