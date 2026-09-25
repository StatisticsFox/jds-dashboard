import "server-only";
import { readColumns, type Cell } from "./google";

// '새빛지역 상담~센터등록 명단 관리' → '센터등록 개강분석 자료' 탭 (1행 머리글, 2행부터 한 줄 = 등록 열매 한 명)
// 개인을 알아볼 수 있는 열(인도자·대상자·교사 이름, 날짜)은 읽지 않고, 아래 항목 열만 읽음

export type AttrKind = "single" | "multi" | "year" | "mbti";
export const ATTRS = [
  { key: "channel", label: "섭외유형", col: "I", kind: "single" },
  { key: "gender", label: "성별", col: "G", kind: "single" },
  { key: "birth", label: "출생연도", col: "H", kind: "year" },
  { key: "env", label: "환경", col: "N", kind: "single" },
  { key: "religion", label: "신성", col: "M", kind: "single" },
  { key: "teacher", label: "교사 단계", col: "O", kind: "single" },
  { key: "mbti", label: "MBTI", col: "P", kind: "mbti" },
  { key: "open", label: "오픈/비오픈", col: "J", kind: "single" },
  { key: "gospel4", label: "복음방 4회 여부", col: "T", kind: "single" },
  { key: "gospelStep", label: "복음방 단계", col: "V", kind: "single" },
  { key: "events", label: "행사 참석", col: "Q", kind: "multi" },
  { key: "leaves", label: "투입 잎사귀", col: "S", kind: "multi" },
] as const satisfies readonly { key: string; label: string; col: string; kind: AttrKind }[];
export type AttrKey = (typeof ATTRS)[number]["key"];

export type Person = { courseId: string; values: Record<AttrKey, string[]> };
export type CenterCourse = { id: string; year: number; month: number; label: string; people: Person[] };

const text = (v: Cell) => String(v ?? "").trim();

export async function getCenterData() {
  const cols = await readColumns(process.env.CENTER_SHEET_ID!, [
    "'센터등록 개강분석 자료'!A2:A", // 개강 연도 (예: 43년)
    "'센터등록 개강분석 자료'!B2:B", // 개강 월 (예: 5월)
    ...ATTRS.map((a) => `'센터등록 개강분석 자료'!${a.col}2:${a.col}`),
  ]);
  const [years, months, ...attrCols] = cols.map((c) => c[0] ?? []);

  const courses = new Map<string, CenterCourse>();
  for (let i = 0; i < years.length; i++) {
    const y = text(years[i]).match(/(\d+)/)?.[1];
    const m = text(months[i]).match(/(\d+)/)?.[1];
    if (!y || !m) continue;
    const id = `${y}-${m}`;
    let course = courses.get(id);
    if (!course) {
      course = { id, year: Number(y), month: Number(m), label: `${m}월 개강`, people: [] };
      courses.set(id, course);
    }
    const values = {} as Record<AttrKey, string[]>;
    ATTRS.forEach((a, j) => {
      const raw = text(attrCols[j]?.[i]);
      // 중복 선택 항목은 쉼표로 나눔. 빈 칸은 '미기재'
      values[a.key] = a.kind === "multi" ? raw.split(/\s*,\s*/).filter(Boolean) : [raw || "미기재"];
    });
    course.people.push({ courseId: id, values });
  }
  return [...courses.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

// 한 항목의 값별 인원. 중복 선택 항목은 한 사람이 여러 값에 들어갈 수 있음 (비율은 항상 '인원 중 %')
export function tally(people: Person[], key: AttrKey) {
  const counts = new Map<string, number>();
  for (const p of people) for (const v of new Set(p.values[key])) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

// 값 표시 순서: 출생연도는 연도순, 복음방 단계는 단계순, 나머지는 많은 순 (미기재·기타류는 뒤로)
export function orderValues(key: AttrKey, counts: Map<string, number>) {
  const attr = ATTRS.find((a) => a.key === key)!;
  const last = (v: string) => (v === "미기재" ? 2 : /^기타/.test(v) || v === "이외" ? 1 : 0);
  return [...counts.keys()].sort((a, b) => {
    if (last(a) !== last(b)) return last(a) - last(b);
    if (attr.kind === "year") return Number(a) - Number(b);
    if (key === "gospelStep") return (Number(a.match(/\d/)?.[0]) || 9) - (Number(b.match(/\d/)?.[0]) || 9);
    return (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
  });
}

// MBTI 네 축 (E/I, S/N, T/F, J/P) 인원
export function mbtiAxes(people: Person[]) {
  const axes = [
    ["E", "I"],
    ["S", "N"],
    ["T", "F"],
    ["J", "P"],
  ] as const;
  return axes.map(([a, b], i) => {
    let na = 0;
    let nb = 0;
    for (const p of people) {
      const t = p.values.mbti[0]?.toUpperCase() ?? "";
      if (!/^[EI][SN][TF][JP]$/.test(t)) continue;
      if (t[i] === a) na++;
      else if (t[i] === b) nb++;
    }
    return { a, b, na, nb };
  });
}
