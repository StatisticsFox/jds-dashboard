import Link from "next/link";
import { AttrCard, CompareTable, MbtiCard } from "@/components/AttrCard";
import { CaptureArea } from "@/components/CaptureArea";
import { Mascot, Star } from "@/components/Mascot";
import { ATTRS, getCenterData, mbtiAxes, orderValues, tally, type AttrKey, type Person } from "@/lib/center";
import { requireUser } from "@/lib/dal";

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm transition-colors ${
    on ? "border-transparent bg-accent font-semibold text-accent-ink shadow-sm" : "border-border text-muted hover:border-accent hover:bg-accent-soft hover:text-foreground"
  }`;
const isAttr = (v: unknown): v is AttrKey => typeof v === "string" && ATTRS.some((a) => a.key === v);

export default async function CenterPage({ searchParams }: PageProps<"/center">) {
  await requireUser();
  const params = await searchParams;
  const courses = await getCenterData();
  const years = [...new Set(courses.map((c) => c.year))];

  // 선택: 개강 하나(?c=43-5), 연도 전체(?c=y43), 전체(?c=all). 없으면 가장 최근 개강
  const sel = typeof params.c === "string" ? params.c : (courses.at(-1)?.id ?? "all");
  const selCourse = courses.find((c) => c.id === sel);
  const selYear = sel.startsWith("y") ? Number(sel.slice(1)) : null;
  const people: Person[] = selCourse ? selCourse.people : courses.filter((c) => sel === "all" || c.year === selYear).flatMap((c) => c.people);
  const selLabel = selCourse ? `${selCourse.year}년 ${selCourse.label}` : selYear ? `${selYear}년 전체` : "전체";
  const compareAttr: AttrKey = isAttr(params.a) ? params.a : "channel";
  const href = (next: { c?: string; a?: string }) => ({ query: { c: sel, a: compareAttr, ...next } });

  const rowsOf = (key: AttrKey, list: Person[]) => {
    const counts = tally(list, key);
    return orderValues(key, counts).map((label) => ({ label, count: counts.get(label) ?? 0 }));
  };
  const top = (key: AttrKey) => rowsOf(key, people).sort((a, b) => b.count - a.count)[0];
  const gender = tally(people, "gender");

  // 개강별 비교: 열(값) 순서는 전체 기준, 행은 개강 + 연도 전체 + 전체
  const allPeople = courses.flatMap((c) => c.people);
  const compareValues = orderValues(compareAttr, tally(allPeople, compareAttr));
  const compareRows = [
    ...years.flatMap((y) => [
      ...courses
        .filter((c) => c.year === y)
        .map((c) => ({ key: c.id, label: `${y}년 ${c.label}`, href: href({ c: c.id }), active: sel === c.id, total: c.people.length, counts: tally(c.people, compareAttr) })),
      (() => {
        const list = courses.filter((c) => c.year === y).flatMap((c) => c.people);
        return { key: `y${y}`, label: `${y}년 전체`, href: href({ c: `y${y}` }), active: sel === `y${y}`, total: list.length, counts: tally(list, compareAttr) };
      })(),
    ]),
    { key: "all", label: "전체", href: href({ c: "all" }), active: sel === "all", total: allPeople.length, counts: tally(allPeople, compareAttr) },
  ];
  const compareLabel = ATTRS.find((a) => a.key === compareAttr)!.label;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Mascot size={48} />
        <div>
          <h1 className="text-3xl">등록 열매 분석</h1>
          <p className="mt-0.5 text-sm text-muted">개강마다 센터에 등록한 열매가 어떤 특징을 가졌는지 봐요</p>
        </div>
      </header>

      {/* 개강 선택: 연도별 한 줄 */}
      <section className="card space-y-4 p-5">
        {years.map((y) => (
          <div key={y} className="space-y-2.5 border-grid [&:not(:first-child)]:border-t [&:not(:first-child)]:pt-4">
            <h2 className="flex items-center gap-2 text-xl">
              <Star size={20} /> {y}년 개강
            </h2>
            <div className="flex flex-wrap gap-2">
              {courses
                .filter((c) => c.year === y)
                .map((c) => (
                  <Link key={c.id} href={href({ c: c.id })} scroll={false} aria-current={sel === c.id} className={chip(sel === c.id)}>
                    {c.label} <span className={sel === c.id ? "opacity-70" : "text-muted/70"}>{c.people.length}</span>
                  </Link>
                ))}
              <Link href={href({ c: `y${y}` })} scroll={false} aria-current={sel === `y${y}`} className={chip(sel === `y${y}`)}>
                {y}년 전체
              </Link>
            </div>
          </div>
        ))}
        <div className="border-t border-grid pt-4">
          <Link href={href({ c: "all" })} scroll={false} aria-current={sel === "all"} className={chip(sel === "all")}>
            전체 ({allPeople.length}명)
          </Link>
        </div>
      </section>

      {/* 요약 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`${selLabel} 등록`} value={`${people.length}명`} />
        <Stat label="성별" value={`여 ${gender.get("여자") ?? 0} · 남 ${gender.get("남자") ?? 0}`} small />
        <Stat label="가장 많은 섭외유형" value={top("channel")?.label ?? "–"} sub={top("channel") ? `${top("channel").count}명` : undefined} small />
        <Stat label="가장 많은 MBTI" value={top("mbti")?.label ?? "–"} sub={top("mbti") ? `${top("mbti").count}명` : undefined} small />
      </section>
      {people.length > 0 && people.length < 15 && (
        <p className="-mt-3 text-xs text-muted">※ 인원이 {people.length}명이라 비율이 크게 흔들릴 수 있어요. 연도 전체와 함께 보면 좋아요.</p>
      )}

      {/* 항목별 특징 */}
      <CaptureArea className="space-y-4" fileName={`등록열매특징_${selLabel}`.replace(/\s/g, "")} caption={`새빛지역 · 센터 등록 열매 · ${selLabel} (${people.length}명)`}>
        <h2 className="flex flex-wrap items-center gap-2 pr-36 text-xl sm:pr-40">
          <Star size={20} /> {selLabel} 등록 열매의 특징 <span className="font-sans text-sm text-muted">{people.length}명 · 비율은 등록 인원 중</span>
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ATTRS.map((a) =>
            a.kind === "mbti" ? (
              <MbtiCard key={a.key} axes={mbtiAxes(people)} top={rowsOf("mbti", people).sort((x, y) => y.count - x.count).slice(0, 6)} total={people.length} />
            ) : (
              <AttrCard
                key={a.key}
                title={a.label}
                total={people.length}
                rows={rowsOf(a.key, people)}
                note={a.kind === "multi" ? "중복 선택 · 한 사람이 여러 개에 들어갈 수 있어요" : undefined}
              />
            ),
          )}
        </div>
      </CaptureArea>

      {/* 개강별 비교 */}
      <CaptureArea className="card space-y-4 p-5" fileName={`등록열매_개강별_${compareLabel}`.replace(/[\s/]/g, "")} caption={`새빛지역 · 센터 등록 열매 · 개강별 ${compareLabel} 비교`}>
        <h2 className="flex flex-wrap items-center gap-2 pr-36 text-xl sm:pr-40">
          <Star size={20} /> 개강별 비교 <span className="font-sans text-sm text-muted">항목을 고르면 개강끼리 비율을 비교해요 · 칸 = 그 개강 등록 인원 중 %</span>
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {ATTRS.map((a) => (
            <Link key={a.key} href={href({ a: a.key })} scroll={false} className={`${chip(compareAttr === a.key)} !px-2.5 !py-1 !text-xs`}>
              {a.label}
            </Link>
          ))}
        </div>
        <CompareTable values={compareValues} rows={compareRows} />
        <p className="text-xs text-muted">
          개강 이름을 누르면 위 특징이 그 개강으로 바뀌어요. 이름·날짜 등 개인을 알아볼 수 있는 정보는 불러오지 않아요.
        </p>
      </CaptureArea>
    </main>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 truncate font-cute ${small ? "text-2xl" : "text-4xl"}`} title={value}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
