import "server-only";
import { readColumns, type Cell } from "./google";
import { TEAM_IDS, zoneOf } from "./teams";
import { FIRST_YEAR, WEEK_PATTERN } from "./weekly";

// 타찾·상예 구역별 순위: '새빛 찾기 체계'에서 구역(팀-구역)마다 날짜별 타찾·상예 기록을 모음
//   타찾 — '누적추이 계산용 시트' A 타찾 보고 날짜 · B 찾기 주차 · C 팀-구역 · M 정파만남(FALSE = 실질)
//   상예 — '열매누적' B 입력 날짜 · C 인도 지역(새빛) · D 인도 팀-구역 · M 목표 개강 (단계가 '찾기'인 행은 제외)
// 날짜는 시트의 날짜 일련번호(1899-12-30부터 센 날 수) 그대로 둠

export type TachatRecord = { date: number; zone: string; real: boolean };
export type SangyeRecord = { date: number; zone: string };

const text = (v: Cell) => String(v ?? "").trim();
const TEAMS = new Set<number>(TEAM_IDS);
const validZone = (v: Cell) => {
  const zone = zoneOf(v);
  return zone && TEAMS.has(Number(zone.split("-")[0])) ? zone : null;
};

export async function getZoneData() {
  const sheet = process.env.GOOGLE_SHEET_ID!;
  const [[tDate, tWeek, tZone, tJeongpa], [fStage, fDate, fRegion, fZone, fCourse]] = await Promise.all([
    readColumns(sheet, [
      "'누적추이 계산용 시트(수정금지)'!A2:A",
      "'누적추이 계산용 시트(수정금지)'!B2:B",
      "'누적추이 계산용 시트(수정금지)'!C2:C",
      "'누적추이 계산용 시트(수정금지)'!M2:M",
    ]),
    readColumns(sheet, ["'열매누적'!A4:A", "'열매누적'!B4:B", "'열매누적'!C4:C", "'열매누적'!D4:D", "'열매누적'!M4:M"]),
  ]);
  const col = (c: Cell[][]) => c[0] ?? [];

  // 순위표에 보여줄 구역: 43년 이후 타찾·상예에 한 번이라도 나온 구역 (기록이 없는 기간이면 0으로 표시)
  const zones = new Set<string>();

  const tachat: TachatRecord[] = [];
  col(tDate).forEach((d, i) => {
    const zone = validZone(col(tZone)[i]);
    if (typeof d !== "number" || !zone) return;
    tachat.push({ date: Math.floor(d), zone, real: col(tJeongpa)[i] === false });
    const m = text(col(tWeek)[i]).match(WEEK_PATTERN);
    if (m && Number(m[1]) >= FIRST_YEAR) zones.add(zone);
  });

  const sangye: SangyeRecord[] = [];
  col(fRegion).forEach((region, i) => {
    const d = col(fDate)[i];
    const zone = validZone(col(fZone)[i]);
    if (text(region) !== "새빛" || typeof d !== "number" || !zone || text(col(fStage)[i]).startsWith("찾기")) return;
    sangye.push({ date: Math.floor(d), zone });
    const m = text(col(fCourse)[i]).match(/^(\d+)년/);
    if (m && Number(m[1]) >= FIRST_YEAR) zones.add(zone);
  });

  const byZoneId = (a: string, b: string) => {
    const [at, az] = a.split("-").map(Number);
    const [bt, bz] = b.split("-").map(Number);
    return at - bt || az - bz;
  };
  return { tachat, sangye, zones: [...zones].sort(byZoneId) };
}

// "2026-09-21" ↔ 시트 날짜 일련번호
const EPOCH = Date.UTC(1899, 11, 30);
export const toSerial = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86_400_000);
};

// 기간 안의 기록을 구역별로 셈 (모든 구역을 0부터 시작)
export function countByZone(records: { date: number; zone: string }[], zones: string[], from: number, to: number) {
  const counts = new Map(zones.map((z) => [z, 0]));
  for (const r of records) {
    if (r.date < from || r.date > to || !counts.has(r.zone)) continue;
    counts.set(r.zone, counts.get(r.zone)! + 1);
  }
  return counts;
}

// 값이 큰 순서의 순위. 같은 값은 같은 순위이고, 다음 값은 바로 다음 순위 (10, 10, 10, 8, 5 → 1, 1, 1, 2, 3)
export function rankOf(values: Map<string, number>) {
  const distinct = [...new Set(values.values())].sort((a, b) => b - a);
  return new Map([...values].map(([k, v]) => [k, distinct.indexOf(v) + 1]));
}
