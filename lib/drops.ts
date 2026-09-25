import "server-only";
import { readColumns } from "./google";
import { describeCourse, FIRST_YEAR, WEEK_PATTERN } from "./weekly";

// '새빛 찾기 체계'의 '누적추이 계산용 시트(수정금지)'에서
// B열(찾기 주차)로 개강·주차를 나누고 K열(탈락 사유)별 개수를 셈.
// K열이 비어 있으면 탈락하지 않은 찾기(진행 중·다음 단계)로 보고 사유 집계에서는 빼고 전체 수에만 포함

// finds: 전체 개수(찾기 또는 열매), reasons: 탈락 사유별 개수
export type WeekDrops = { finds: number; reasons: Map<string, number> };

// 같은 사유가 띄어쓰기만 다르게 적힌 경우를 하나로 (예: "지인 침(입막음)" / "지인 침 (입막음)")
export const normalizeReason = (raw: unknown) =>
  String(raw ?? "")
    .trim()
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s+/g, " ");
export type DropCourse = { id: string; label: string; order: number; weeks: Map<number, WeekDrops> };

export async function getDropData() {
  const [weekCol, reasonCol] = await readColumns(process.env.GOOGLE_SHEET_ID!, [
    "'누적추이 계산용 시트(수정금지)'!B2:B",
    "'누적추이 계산용 시트(수정금지)'!K2:K",
  ]);
  const weeksRaw = weekCol[0] ?? [];
  const reasonsRaw = reasonCol[0] ?? [];

  const courses = new Map<string, DropCourse>();
  const totals = new Map<string, number>();
  for (let i = 0; i < weeksRaw.length; i++) {
    const m = String(weeksRaw[i] ?? "").trim().match(WEEK_PATTERN);
    if (!m || Number(m[1]) < FIRST_YEAR) continue;
    const [, year, month, weekStr] = m;
    const id = `${year}-${month}`;
    let course = courses.get(id);
    if (!course) {
      const { label, order } = describeCourse(month);
      course = { id, label, order: Number(year) * 100 + order, weeks: new Map() };
      courses.set(id, course);
    }
    const week = Number(weekStr);
    const bucket = course.weeks.get(week) ?? { finds: 0, reasons: new Map<string, number>() };
    bucket.finds++;
    const reason = normalizeReason(reasonsRaw[i]);
    if (reason) {
      bucket.reasons.set(reason, (bucket.reasons.get(reason) ?? 0) + 1);
      totals.set(reason, (totals.get(reason) ?? 0) + 1);
    }
    course.weeks.set(week, bucket);
  }

  return {
    // 사유 순서: 43년 전체에서 많은 순 (표의 열 순서로 사용)
    reasons: [...totals].sort((a, b) => b[1] - a[1]).map(([r]) => r),
    courses: [...courses.values()].sort((a, b) => a.order - b.order),
  };
}

// 여러 주차를 합침
export function sumDrops(list: WeekDrops[]): WeekDrops {
  const reasons = new Map<string, number>();
  let finds = 0;
  for (const w of list) {
    finds += w.finds;
    for (const [r, n] of w.reasons) reasons.set(r, (reasons.get(r) ?? 0) + n);
  }
  return { finds, reasons };
}
