import Link from "next/link";
import { CaptureArea } from "@/components/CaptureArea";
import { MetricCompare } from "@/components/MetricCompare";
import { TeamDetail } from "@/components/TeamDetail";
import { TeamTable } from "@/components/TeamTable";
import { formatCount, formatCountDiff, formatRate, formatRateDiff } from "@/lib/format";
import { COUNT_METRICS, getConversionData, RATE_METRICS, summarize, TEAMS, toRates, type Settings } from "@/lib/conversion";

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function ConversionPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const { defaults, presets, courses, count } = await getConversionData();

  // 주소에 값이 없으면 시트 '팀별 유월율'에 저장된 설정값을 사용
  const settings: Settings = {
    tachatStart: isDate(params.ts) ? params.ts : defaults.tachatStart,
    tachatEnd: isDate(params.te) ? params.te : defaults.tachatEnd,
    sangyeStart: isDate(params.ss) ? params.ss : defaults.sangyeStart,
    sangyeEnd: isDate(params.se) ? params.se : defaults.sangyeEnd,
    course: typeof params.course === "string" && courses.includes(params.course) ? params.course : defaults.course,
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
      <header>
        <h1 className="text-2xl font-bold">새빛지역 팀별 유월율</h1>
        <p className="mt-1 text-sm text-muted">
          {settings.course} 개강 기준 · 타찾 {settings.tachatStart} ~ {settings.tachatEnd} · 상예 {settings.sangyeStart} ~ {settings.sangyeEnd}
        </p>
      </header>

      {/* 설정: 제출하면 ?ts=...&te=...&ss=...&se=...&course=... 주소로 이동 */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <form className="flex flex-wrap items-end gap-x-6 gap-y-4 text-sm">
          {tab !== "all" && <input type="hidden" name="team" value={tab} />}
          <DateRange label="타찾 기간" names={["ts", "te"]} values={[settings.tachatStart, settings.tachatEnd]} />
          <DateRange label="상예 기간" names={["ss", "se"]} values={[settings.sangyeStart, settings.sangyeEnd]} />
          <label className="space-y-1.5">
            <span className="block font-medium">기준 개강</span>
            <select name="course" defaultValue={settings.course} className="rounded-md border border-border bg-background px-2 py-1.5">
              {courses.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button className="rounded-md bg-foreground px-4 py-1.5 font-medium text-background">적용</button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-grid pt-4 text-xs">
          <span className="text-muted">기간 불러오기</span>
          {presets.map((p) => (
            <Link
              key={p.label}
              href={{ query: { ...query, ts: p.tachatStart, te: p.tachatEnd, ss: p.sangyeStart, se: p.sangyeEnd, ...(tab !== "all" && { team: tab }) } }}
              className="rounded-full border border-border px-2.5 py-1 hover:bg-background"
            >
              {p.label}
            </Link>
          ))}
          <Link href={tab === "all" ? "/" : { query: { team: tab } }} className="ml-auto text-muted underline-offset-2 hover:underline">
            시트 설정값으로 되돌리기
          </Link>
        </div>
        {warnings.map((w) => (
          <p key={w} className="mt-3 text-sm font-medium">
            ⚠️ {w}
          </p>
        ))}
      </section>

      {/* 지역 전체 흐름 */}
      <CaptureArea className="rounded-xl border border-border bg-surface p-5" fileName={fileName("지역전체")} caption={caption}>
        <h2 className="font-semibold">지역 전체</h2>
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COUNT_METRICS.map((m, i) => {
            const rate = RATE_METRICS.find((r) => r.numerator === m.key && r.key !== "tachatToSangdam");
            return (
              <li key={m.key} className="rounded-lg bg-background p-3" title={m.hint}>
                <div className="text-xs text-muted">
                  {i + 1}. {m.label}
                </div>
                <div className="mt-1 text-3xl font-bold">{formatCount(region[m.key])}</div>
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
      <nav className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1 rounded-lg border border-border bg-surface p-1 text-sm">
          {[{ id: "all" as const, label: "전체 비교", emoji: "" }, ...TEAMS].map((t) => (
            <Link
              key={t.id}
              href={{ query: { ...query, ...(t.id !== "all" && { team: t.id }) } }}
              scroll={false}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${t.id === tab ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
            >
              {t.emoji} {t.label}
            </Link>
          ))}
        </div>
      </nav>

      {selected ? (
        <CaptureArea className="-m-4 space-y-4 p-4" fileName={fileName(`${selected.label}`)} caption={caption}>
          <h2 className="text-xl font-bold">
            {selected.emoji} {selected.label}
          </h2>
          <TeamDetail team={selected} summary={summary} teamCount={teams.length} />
        </CaptureArea>
      ) : (
        <>
          <CaptureArea className="rounded-xl border border-border bg-surface p-5" fileName={fileName("전체_유월율")} caption={caption}>
            <h2 className="font-semibold">
              유월율 <span className="ml-1 text-sm font-normal text-muted">지역 유월율 대비</span>
            </h2>
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

          <CaptureArea className="rounded-xl border border-border bg-surface p-5" fileName={fileName("전체_수치")} caption={caption}>
            <h2 className="font-semibold">
              수치 <span className="ml-1 text-sm font-normal text-muted">팀 평균 달성 개수 대비</span>
            </h2>
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

          <CaptureArea className="rounded-xl border border-border bg-surface p-5" fileName={fileName("전체_상세표")} caption={caption}>
            <h2 className="font-semibold">팀별 상세</h2>
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
        <input type="date" name={names[0]} defaultValue={values[0]} className="rounded-md border border-border bg-background px-2 py-1.5" />
        <span className="text-muted">~</span>
        <input type="date" name={names[1]} defaultValue={values[1]} className="rounded-md border border-border bg-background px-2 py-1.5" />
      </div>
    </fieldset>
  );
}
