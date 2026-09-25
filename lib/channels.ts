import "server-only";
import { readColumns } from "./google";
import { describeCourse, FIRST_YEAR, WEEK_PATTERN } from "./weekly";

// '새빛 찾기 체계'의 '누적추이 계산용 시트(수정금지)'에서
// B열(찾기 주차)로 개강·주차를 나누고 F열(섭외유형)별 찾기 수를 셈.
// 개강은 찾기 주차 가운데의 "N월"로 판단 (예: "43년 9월 8주차" → 43년 9월 개강 8주차)

export const OTHER = "기타";
// 이 비율(43년 전체 기준) 미만인 섭외유형은 '기타'로 묶음. 선 색이 8가지라 최대 7종 + 기타
const MIN_SHARE = 0.01;
const MAX_TYPES = 7;

export type ChannelCourse = {
  id: string; // "43-9"
  label: string; // "9월 개강"
  order: number;
  weeks: Map<number, Map<string, number>>; // 주차 → (섭외유형 → 개수)
};

export async function getChannelData() {
  const [weekCol, typeCol] = await readColumns(process.env.GOOGLE_SHEET_ID!, [
    "'누적추이 계산용 시트(수정금지)'!B2:B",
    "'누적추이 계산용 시트(수정금지)'!F2:F",
  ]);
  const weeksRaw = weekCol[0] ?? [];
  const typesRaw = typeCol[0] ?? [];

  // 1) 43년 이후 찾기만 모아서 섭외유형 전체 순위를 구함 (색은 이 순위로 고정)
  const rows: { year: number; month: string; week: number; type: string }[] = [];
  const totals = new Map<string, number>();
  for (let i = 0; i < weeksRaw.length; i++) {
    const m = String(weeksRaw[i] ?? "").trim().match(WEEK_PATTERN);
    if (!m || Number(m[1]) < FIRST_YEAR) continue;
    const type = String(typesRaw[i] ?? "").trim() || OTHER;
    rows.push({ year: Number(m[1]), month: m[2], week: Number(m[3]), type });
    totals.set(type, (totals.get(type) ?? 0) + 1);
  }
  const ranked = [...totals].sort((a, b) => b[1] - a[1]);
  const main = ranked
    .filter(([type, n]) => type !== OTHER && n / rows.length >= MIN_SHARE)
    .slice(0, MAX_TYPES)
    .map(([type]) => type);
  const categories = [...main, OTHER]; // 표시 순서 = 색 순서 (기타는 항상 마지막, 회색)
  const grouped = new Map([...totals].map(([type]) => [type, main.includes(type) ? type : OTHER]));

  // 2) 개강·주차별로 섭외유형 개수 집계
  const courses = new Map<string, ChannelCourse>();
  for (const r of rows) {
    const id = `${r.year}-${r.month}`;
    let course = courses.get(id);
    if (!course) {
      const { label, order } = describeCourse(r.month);
      course = { id, label, order: r.year * 100 + order, weeks: new Map() };
      courses.set(id, course);
    }
    const byType = course.weeks.get(r.week) ?? new Map<string, number>();
    const cat = grouped.get(r.type)!;
    byType.set(cat, (byType.get(cat) ?? 0) + 1);
    course.weeks.set(r.week, byType);
  }

  // 기타로 묶인 원래 유형 이름 (안내용)
  const otherMembers = ranked.filter(([type]) => grouped.get(type) === OTHER).map(([type]) => type);

  return {
    categories,
    otherMembers,
    courses: [...courses.values()].sort((a, b) => a.order - b.order),
  };
}
