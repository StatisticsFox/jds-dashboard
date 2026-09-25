import "server-only";
import { readValues } from "./google";

// '새빛 찾기 체계' 스프레드시트에서 지표별 주차 열을 읽어 개강별·주차별 개수로 집계
// 값 예: "43년 9월 8주차", "42년 12.29월 10주차". 형식이 다르거나 빈 칸인 행은 세지 않음
export const WEEKLY_METRICS = {
  find: { label: "찾기", range: "'누적추이 계산용 시트(수정금지)'!B2:B" }, // B열 찾기 주차
  sangdam: { label: "상담", range: "'비상'!A2:A" }, // A열 주차
} as const;
export type WeeklyMetric = keyof typeof WEEKLY_METRICS;

// 이 년도부터만 보여줌 (그 이전 데이터는 형식이 달라 제외)
export const FIRST_YEAR = 43;

export type Course = {
  id: string; // 주소에 쓰는 값 (예: "43-9", "43-12.1")
  year: number; // 43
  label: string; // "9월 개강", "12월 개강1"
  order: number; // 정렬용 (년·월·12월 개강 순서)
  weeks: Map<number, number>; // 주차 → 개수
};

// "43년 9월 8주차" → [년, 월(가운데 값 = 개강), 주차]
export const WEEK_PATTERN = /^(\d+)년\s*([\d.]+)월\s*(\d+)주차$/;

// "9" → 9월 개강, "12.1" → 12월 개강1, "12.29" → 12월 개강2
export function describeCourse(month: string) {
  if (month === "12.1") return { label: "12월 개강1", order: 12.1 };
  if (month === "12.29") return { label: "12월 개강2", order: 12.2 };
  const m = Number(month);
  return { label: `${Number.isInteger(m) ? m : month}월 개강`, order: Number.isFinite(m) ? m : 99 };
}

export async function getCourses(metric: WeeklyMetric): Promise<Course[]> {
  const rows = await readValues(process.env.GOOGLE_SHEET_ID!, WEEKLY_METRICS[metric].range);
  const courses = new Map<string, Course>();
  for (const [raw = ""] of rows) {
    const m = raw.trim().match(WEEK_PATTERN);
    if (!m) continue; // 빈 칸 등
    const [, year, month, week] = m;
    if (Number(year) < FIRST_YEAR) continue;
    const id = `${year}-${month}`;
    let course = courses.get(id);
    if (!course) {
      const { label, order } = describeCourse(month);
      course = { id, year: Number(year), label, order: Number(year) * 100 + order, weeks: new Map() };
      courses.set(id, course);
    }
    course.weeks.set(Number(week), (course.weeks.get(Number(week)) ?? 0) + 1);
  }
  return [...courses.values()].sort((a, b) => a.order - b.order);
}

// 선택한 개강들의 주차 축: 큰 주차부터 (예: 10, 9, 8, 7, 6)
// cumulative: 누적 개수 — 각 개강의 가장 큰 주차부터 차례로 더함 (9주차 = 10주차 + 9주차)
// weekly: 그 주차에 새로 들어온 개수
// 각 개강에서 데이터가 있는 가장 큰~작은 주차 사이의 빈 주차는 0, 그 밖은 null(해당 없음)
export function weeklyTable(courses: Course[]) {
  const all = courses.flatMap((c) => [...c.weeks.keys()]);
  if (!all.length) return { weeks: [] as number[], cumulative: [] as (number | null)[][], weekly: [] as (number | null)[][] };
  const max = Math.max(...all);
  const min = Math.min(...all);
  const weeks = Array.from({ length: max - min + 1 }, (_, i) => max - i);

  const weekly = courses.map((c) => {
    const own = [...c.weeks.keys()];
    const hi = Math.max(...own);
    const lo = Math.min(...own);
    return weeks.map((w) => (w > hi || w < lo ? null : (c.weeks.get(w) ?? 0)));
  });
  const cumulative = weekly.map((col) => {
    let sum = 0;
    return col.map((v) => (v === null ? null : (sum += v)));
  });
  return { weeks, cumulative, weekly };
}
