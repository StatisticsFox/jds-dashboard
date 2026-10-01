import "server-only";
import { readColumns, type Cell } from "./google";
import { TEAM_IDS, zoneOf } from "./teams";
import { getWeekCalendar } from "./week-calendar";
import { describeCourse, FIRST_YEAR, WEEK_PATTERN } from "./weekly";

// 타찾·상예 구역별 순위: '새빛 찾기 체계'에서 구역(팀-구역)마다 월·주차별 타찾·상예 기록을 모음
//   타찾 — '누적추이 계산용 시트' B 찾기 주차 · C 팀-구역 · M 정파만남(FALSE = 실질)
//   상예 — '열매누적' B 입력 날짜 · C 인도 지역(새빛) · D 인도 팀-구역 (단계가 '찾기'인 행은 제외)
//          주차 칸이 없어서 입력 날짜를 찾기·상담 기록의 날짜↔주차 달력으로 주차에 맞춤 (열매 추이 상예와 같은 방식)
// 월 = 주차 이름의 "N월" (예: 43년 9월 8주차 → 43년 9월)
// 순위에 보여줄 구역 = '새빛 목표달성현황표' W열에 있는 지금 구역 (없어진 구역은 빼고, 그 구역 기록도 세지 않음)

export type ZoneRecord = { month: string; week: number; zone: string; real?: boolean };
export type ZoneMonth = { id: string; label: string; order: number; weeks: number[] };

const text = (v: Cell) => String(v ?? "").trim();
const TEAMS = new Set<number>(TEAM_IDS);
const validZone = (v: Cell) => {
  const zone = zoneOf(v);
  return zone && TEAMS.has(Number(zone.split("-")[0])) ? zone : null;
};

export async function getZoneData() {
  const sheet = process.env.GOOGLE_SHEET_ID!;
  const [[tWeek, tZone, tJeongpa], [fStage, fDate, fRegion, fZone], [current], weekOn] = await Promise.all([
    readColumns(sheet, ["'누적추이 계산용 시트(수정금지)'!B2:B", "'누적추이 계산용 시트(수정금지)'!C2:C", "'누적추이 계산용 시트(수정금지)'!M2:M"]),
    readColumns(sheet, ["'열매누적'!A4:A", "'열매누적'!B4:B", "'열매누적'!C4:C", "'열매누적'!D4:D"]),
    readColumns(sheet, ["'새빛 목표달성현황표'!W1:W200"]),
    getWeekCalendar(),
  ]);
  const col = (c: Cell[][]) => c[0] ?? [];

  const months = new Map<string, ZoneMonth & { weekSet: Set<number> }>();
  const zones = new Set<string>();
  // 주차 이름 → 기록 하나 (43년 이후만). 월·주차 목록과 구역 목록도 함께 모음
  const record = (week: string | null, zoneCell: Cell, real?: boolean): ZoneRecord | null => {
    const m = week?.match(WEEK_PATTERN);
    const zone = validZone(zoneCell);
    if (!m || Number(m[1]) < FIRST_YEAR || !zone) return null;
    const id = `${m[1]}-${m[2]}`;
    let month = months.get(id);
    if (!month) {
      const { label, order } = describeCourse(m[2]);
      month = { id, label: label.replace(" 개강", ""), order: Number(m[1]) * 100 + order, weeks: [], weekSet: new Set() };
      months.set(id, month);
    }
    month.weekSet.add(Number(m[3]));
    zones.add(zone);
    return { month: id, week: Number(m[3]), zone, real };
  };

  const tachat = col(tWeek)
    .map((w, i) => record(text(w), col(tZone)[i], col(tJeongpa)[i] === false))
    .filter((r): r is ZoneRecord => r !== null);
  const sangye = col(fRegion)
    .map((region, i) => {
      const d = col(fDate)[i];
      if (text(region) !== "새빛" || typeof d !== "number" || text(col(fStage)[i]).startsWith("찾기")) return null;
      return record(weekOn(d), col(fZone)[i]);
    })
    .filter((r): r is ZoneRecord => r !== null);

  const byZoneId = (a: string, b: string) => {
    const [at, az] = a.split("-").map(Number);
    const [bt, bz] = b.split("-").map(Number);
    return at - bt || az - bz;
  };
  // 지금 구역 목록 ("1-1" 모양인 칸만). 읽지 못하면 기록에 나온 구역 전부
  const currentZones = (current[0] ?? []).map((v) => (/^\s*\d+\s*-\s*\d+\s*$/.test(String(v ?? "")) ? validZone(v) : null)).filter((z): z is string => z !== null);
  return {
    tachat,
    sangye,
    zones: [...new Set(currentZones.length ? currentZones : zones)].sort(byZoneId),
    // 월은 오래된 순, 주차는 큰 수부터 (10주차 → 6주차, 개강에 가까워지는 순서)
    months: [...months.values()]
      .sort((a, b) => a.order - b.order)
      .map(({ weekSet, ...m }) => ({ ...m, weeks: [...weekSet].sort((a, b) => b - a) })),
  };
}

// 고른 월·주차(전체면 week = "all") 안의 기록을 구역별로 셈 (모든 구역을 0부터 시작)
export function countByZone(records: ZoneRecord[], zones: string[], month: string, week: number | "all") {
  const counts = new Map(zones.map((z) => [z, 0]));
  for (const r of records) {
    if (r.month !== month || (week !== "all" && r.week !== week) || !counts.has(r.zone)) continue;
    counts.set(r.zone, counts.get(r.zone)! + 1);
  }
  return counts;
}

// 같은 수를 한 묶음으로: 큰 수부터 [{ rank: 1, value: 8, zones: ["2-1", "5-2"] }, …]
// 순위는 묶음 순서 그대로 (동점 다음 수는 바로 다음 순위: 8, 8, 6 → 1위 묶음, 2위)
export function groupByValue(counts: Map<string, number>) {
  const groups = new Map<number, string[]>();
  for (const [zone, n] of counts) groups.set(n, [...(groups.get(n) ?? []), zone]);
  return [...groups]
    .sort((a, b) => b[0] - a[0])
    .map(([value, zones], i) => ({ rank: i + 1, value, zones }));
}
