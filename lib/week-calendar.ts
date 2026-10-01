import "server-only";
import { readColumns, type Cell } from "./google";
import { WEEK_PATTERN } from "./weekly";

// 날짜 → 주차 이름 ("43년 11월 9주차") 달력
// 주차 칸이 없는 기록(열매누적의 상예 등)을 주차로 맞출 때 사용.
// '누적추이 계산용 시트' A 타찾 보고 날짜 ↔ B 찾기 주차, '비상' B 컨펌 날짜 ↔ A 주차 기록을 모아
// 날짜마다 가장 많이 적힌 주차를 그 날짜의 주차로 봄. 기록이 없는 날(주말 등)은 가장 가까운 이전 날짜(최대 6일 전)의 주차
export async function getWeekCalendar() {
  const sheet = process.env.GOOGLE_SHEET_ID!;
  const [[tDate, tWeek], [bWeek, bDate]] = await Promise.all([
    readColumns(sheet, ["'누적추이 계산용 시트(수정금지)'!A2:A", "'누적추이 계산용 시트(수정금지)'!B2:B"]),
    readColumns(sheet, ["'비상'!A2:A", "'비상'!B2:B"]),
  ]);

  const votes = new Map<number, Map<string, number>>();
  const vote = (date: Cell, week: Cell) => {
    const w = String(week ?? "").trim();
    if (typeof date !== "number" || !WEEK_PATTERN.test(w)) return;
    const byWeek = votes.get(Math.floor(date)) ?? new Map<string, number>();
    byWeek.set(w, (byWeek.get(w) ?? 0) + 1);
    votes.set(Math.floor(date), byWeek);
  };
  (tDate[0] ?? []).forEach((d, i) => vote(d, tWeek[0]?.[i]));
  (bDate[0] ?? []).forEach((d, i) => vote(d, bWeek[0]?.[i]));
  const weekOf = new Map([...votes].map(([d, byWeek]) => [d, [...byWeek].sort((a, b) => b[1] - a[1])[0][0]]));

  // 날짜 일련번호 → 주차 이름 (못 찾으면 null)
  return (date: number) => {
    for (let back = 0; back <= 6; back++) {
      const w = weekOf.get(Math.floor(date) - back);
      if (w) return w;
    }
    return null;
  };
}
