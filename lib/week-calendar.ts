import "server-only";
import { readColumns, type Cell } from "./google";
import { WEEK_PATTERN } from "./weekly";

// 날짜 → 주차 이름 ("43년 11월 9주차") 달력
// 주차 칸이 없는 기록(열매누적의 상예 등)을 주차로 맞출 때 사용.
// '누적추이 계산용 시트' A 타찾 보고 날짜 ↔ B 찾기 주차, '비상' B 컨펌 날짜 ↔ A 주차 기록을 모아
// 날짜마다 가장 많이 적힌 주차를 그 날짜의 주차로 봄. 기록이 없는 날(주말 등)은 가장 가까운 이전 날짜(최대 6일 전)의 주차
export async function getWeekCalendar() {
  const weekOf = await weekByDate();
  // 날짜 일련번호 → 주차 이름 (못 찾으면 null)
  return (date: number) => {
    for (let back = 0; back <= 6; back++) {
      const w = weekOf.get(Math.floor(date) - back);
      if (w) return w;
    }
    return null;
  };
}

// 개강별 기간(찾기 첫 주차 ~ 마지막 주차의 날짜): 날짜마다 정한 주차의 '개강'(43년 9월 8주차 → 43-9)을 날짜 순으로 늘어놓고,
// 이웃한 두 개강의 경계를 '기록이 가장 적게 어긋나는 날'로 정해 겹치지 않게 나눔 (드문 늦은 기록 때문에 기간이 겹치는 것을 막음)
export type CoursePeriod = { id: string; year: number; month: string; start: number; end: number };
export async function getCoursePeriods(): Promise<CoursePeriod[]> {
  const weekOf = await weekByDate();
  const days = [...weekOf].map(([date, week]) => {
    const m = week.match(WEEK_PATTERN)!;
    return { date, id: `${m[1]}-${m[2]}`, year: Number(m[1]), month: m[2] };
  });
  days.sort((a, b) => a.date - b.date);
  // 개강 순서: 각 개강이 처음 나온 날 순 (days가 날짜 순이라 처음 만난 순서 그대로)
  const order: { id: string; year: number; month: string }[] = [];
  for (const d of days) if (!order.some((o) => o.id === d.id)) order.push({ id: d.id, year: d.year, month: d.month });
  const rank = new Map(order.map((o, i) => [o.id, i]));

  const periods: CoursePeriod[] = order.map((o) => ({ ...o, start: 0, end: 0 }));
  periods[0].start = days.find((d) => d.id === order[0].id)!.date;
  for (let i = 0; i < periods.length - 1; i++) {
    // i번째와 i+1번째 개강 사이 경계 b: (b 전에 나온 i+1의 날) + (b 이후에 나온 i의 날)이 가장 적은 날
    const pair = days.filter((d) => rank.get(d.id) === i || rank.get(d.id) === i + 1);
    let best = { b: pair.find((d) => rank.get(d.id) === i + 1)!.date, err: Infinity };
    for (const cand of pair) {
      if (rank.get(cand.id) !== i + 1 || cand.date <= periods[i].start) continue;
      const err = pair.filter((d) => (rank.get(d.id) === i + 1 && d.date < cand.date) || (rank.get(d.id) === i && d.date >= cand.date)).length;
      if (err < best.err) best = { b: cand.date, err };
    }
    periods[i].end = best.b - 1;
    periods[i + 1].start = best.b;
  }
  periods[periods.length - 1].end = days.at(-1)!.date;
  return periods;
}

// 날짜 일련번호 → 그 날짜에 가장 많이 적힌 주차 이름
async function weekByDate() {
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
  return new Map([...votes].map(([d, byWeek]) => [d, [...byWeek].sort((a, b) => b[1] - a[1])[0][0]]));
}
