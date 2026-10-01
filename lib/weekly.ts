import "server-only";
import { readColumns, readValues } from "./google";
import { teamOf } from "./teams";
import { getWeekCalendar } from "./week-calendar";

// '새빛 찾기 체계' 스프레드시트에서 지표별 주차 열을 읽어 개강별·주차별 개수로 집계
// 값 예: "43년 9월 8주차", "42년 12.29월 10주차". 형식이 다르거나 빈 칸인 행은 세지 않음
// courseRange가 있으면 개강은 그 열("43년 9월"), 주차는 range 열("9월 8주차")에서 따로 읽음
// weight: 한 줄을 몇 명으로 셀지 (육따기는 인도·교육 등 역할마다 한 줄씩이라 0.5명)
// teamRange: 팀-구역 열 ("3-2" → 3팀). 팀을 고르면 그 팀 행만 셈
export const WEEKLY_METRICS: Record<string, { label: string; range: string; teamRange: string; courseRange?: string; weight?: number }> = {
  find: { label: "찾기", range: "'누적추이 계산용 시트(수정금지)'!B2:B", teamRange: "'누적추이 계산용 시트(수정금지)'!C2:C" }, // B열 찾기 주차, C열 팀-구역
  sangdam: { label: "상담", range: "'비상'!A2:A", teamRange: "'비상'!C2:C" }, // A열 주차, C열 팀-구
  yuk: { label: "육따기", range: "'육따기'!B2:B", teamRange: "'육따기'!C2:C", courseRange: "'육따기'!A2:A", weight: 0.5 }, // A열 개강월, B열 "N월 N주차", C열 팀-구역
};
// 상예는 주차 칸이 없어 별도로 셈 (getSangyeCourses)
export const SANGYE_LABEL = "상예";
export type WeeklyMetric = "find" | "sangye" | "sangdam" | "yuk";

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

// team: 1~7이면 그 팀 행만 셈. 개강·주차 목록은 팀과 상관없이 지역 전체 기준으로 만들어서
// 팀을 바꿔도 같은 주차 축을 쓰고, 그 팀이 한 명도 없는 주차는 0으로 나옴
export async function getCourses(metric: WeeklyMetric, team?: number): Promise<Course[]> {
  if (metric === "sangye") return getSangyeCourses(team);
  const config = WEEKLY_METRICS[metric];
  const [rows, courseRows, teamRows] = await Promise.all([
    readValues(process.env.GOOGLE_SHEET_ID!, config.range),
    config.courseRange ? readValues(process.env.GOOGLE_SHEET_ID!, config.courseRange) : Promise.resolve([] as string[][]),
    team ? readValues(process.env.GOOGLE_SHEET_ID!, config.teamRange) : Promise.resolve([] as string[][]),
  ]);
  const weight = config.weight ?? 1;
  const courses = new Map<string, Course>();
  for (let i = 0; i < rows.length; i++) {
    const raw = (rows[i][0] ?? "").trim();
    let m: RegExpMatchArray | null;
    if (config.courseRange) {
      // 개강은 개강월 열("43년 9월"), 주차는 "9월 8주차"의 숫자
      const c = (courseRows[i]?.[0] ?? "").trim().match(/^(\d+)년\s*([\d.]+)월$/);
      const w = raw.match(/(\d+)\s*주차/);
      m = c && w ? [raw, c[1], c[2], w[1]] : null;
    } else {
      m = raw.match(WEEK_PATTERN);
    }
    if (!m) continue; // 빈 칸·연도 없는 값 등
    const [, year, month, week] = m;
    if (Number(year) < FIRST_YEAR) continue;
    const id = `${year}-${month}`;
    let course = courses.get(id);
    if (!course) {
      const { label, order } = describeCourse(month);
      course = { id, year: Number(year), label, order: Number(year) * 100 + order, weeks: new Map() };
      courses.set(id, course);
    }
    const counted = !team || teamOf(teamRows[i]?.[0]) === team;
    course.weeks.set(Number(week), (course.weeks.get(Number(week)) ?? 0) + (counted ? weight : 0));
  }
  return [...courses.values()].sort((a, b) => a.order - b.order);
}

// 상예: '열매누적'에서 인도 지역이 새빛인 행(단계가 '찾기'인 행 제외, 탈락 포함 = 상예 컨펌된 모든 열매)
// B 입력 날짜를 날짜↔주차 달력으로 주차에 맞추고, 팀은 D 인도 팀-구역
async function getSangyeCourses(team?: number): Promise<Course[]> {
  const [weekOn, [stage, date, region, zone]] = await Promise.all([
    getWeekCalendar(),
    readColumns(process.env.GOOGLE_SHEET_ID!, ["'열매누적'!A4:A", "'열매누적'!B4:B", "'열매누적'!C4:C", "'열매누적'!D4:D"]),
  ]);
  const courses = new Map<string, Course>();
  (region[0] ?? []).forEach((r, i) => {
    const d = date[0]?.[i];
    if (String(r ?? "").trim() !== "새빛" || typeof d !== "number" || String(stage[0]?.[i] ?? "").trim().startsWith("찾기")) return;
    const m = weekOn(d)?.match(WEEK_PATTERN);
    if (!m || Number(m[1]) < FIRST_YEAR) return;
    const [, year, month, week] = m;
    const id = `${year}-${month}`;
    let course = courses.get(id);
    if (!course) {
      const { label, order } = describeCourse(month);
      course = { id, year: Number(year), label, order: Number(year) * 100 + order, weeks: new Map() };
      courses.set(id, course);
    }
    const counted = !team || teamOf(zone[0]?.[i]) === team;
    course.weeks.set(Number(week), (course.weeks.get(Number(week)) ?? 0) + (counted ? 1 : 0));
  });
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
