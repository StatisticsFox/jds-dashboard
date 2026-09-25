import type { Fruit } from "./sheets";

export type Count = { label: string; count: number };

// 기준 날짜가 from~to(양 끝 포함, YYYY-MM-DD) 안에 있는 열매만
export function filterByDate(fruits: Fruit[], from: string, to: string) {
  return fruits.filter((f) => f.date !== null && f.date >= from && f.date <= to);
}

// 데이터에 있는 가장 이른/늦은 기준 날짜
export function dateBounds(fruits: Fruit[]) {
  const dates = fruits.map((f) => f.date).filter((d): d is string => d !== null).sort();
  return { min: dates[0], max: dates.at(-1) };
}

// 월별 열매 수. 열매가 없는 달도 0으로 채움
export function countByMonth(fruits: Fruit[], from: string, to: string): Count[] {
  const counts = new Map<string, number>();
  for (const f of fruits) {
    const month = f.date!.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  const result: Count[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const end = to.slice(0, 7);
  for (;;) {
    const month = `${y}-${String(m).padStart(2, "0")}`;
    if (month > end) break;
    result.push({ label: month, count: counts.get(month) ?? 0 });
    if (++m > 12) [y, m] = [y + 1, 1];
  }
  return result;
}

// 인도 팀별 열매 수 (팀 번호 순)
export function countByTeam(fruits: Fruit[]): Count[] {
  const counts = new Map<string, number>();
  for (const f of fruits) {
    const team = f.team ?? "미지정";
    counts.set(team, (counts.get(team) ?? 0) + 1);
  }
  return [...counts]
    .sort(([a], [b]) => (Number(a) || Infinity) - (Number(b) || Infinity))
    .map(([team, count]) => ({ label: team === "미지정" ? team : `${team}팀`, count }));
}
