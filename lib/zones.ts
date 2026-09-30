import "server-only";
import { readColumns, type Cell } from "./google";
import { TEAM_IDS, zoneOf } from "./teams";
import { describeCourse, FIRST_YEAR, WEEK_PATTERN } from "./weekly";

// 구역별 순위: '새빛 찾기 체계'에서 구역(팀-구역)마다 주차별 타찾·상예·상담·따기 수를 셈
//   타찾 — '누적추이 계산용 시트' B 찾기 주차 · C 팀-구역 (한 줄 = 1명)
//   상담 — '비상' A 주차 · C 팀-구 (한 줄 = 1명)
//   상예 — '열매누적' B 입력 날짜 · C 인도 지역(새빛) · D 인도 팀-구역. 주차 칸이 없어서
//          입력 날짜를 타찾·비상 시트의 날짜↔주차 기록으로 주차에 맞춤 (단계가 '찾기'인 행은 제외)
//   따기 — '육따기' A 개강월 · B "N월 N주차" · C 팀-구역 (역할마다 한 줄이라 한 줄 = 0.5명)
// 주차 이름의 "N월"(예: 43년 9월 8주차 → 9월)을 한 달로 봄

export const ZONE_METRICS = { tachat: "타찾", sangye: "상예", sangdam: "상담", yuk: "따기" } as const;
export type ZoneMetric = keyof typeof ZONE_METRICS;
export const ZONE_METRIC_KEYS = Object.keys(ZONE_METRICS) as ZoneMetric[];
export type ZoneCounts = Record<ZoneMetric, number>;

export type ZoneMonth = {
  id: string; // "43-9"
  label: string; // "9월"
  order: number;
  weeks: Map<number, Map<string, ZoneCounts>>; // 주차 → 구역 → 수
};

const emptyCounts = (): ZoneCounts => ({ tachat: 0, sangye: 0, sangdam: 0, yuk: 0 });
const text = (v: Cell) => String(v ?? "").trim();
const TEAMS = new Set<number>(TEAM_IDS);

export async function getZoneData() {
  const sheet = process.env.GOOGLE_SHEET_ID!;
  const [[tDate, tWeek, tZone], [bWeek, bDate, bZone], [fStage, fDate, fRegion, fZone], [yCourse, yWeek, yZone]] = await Promise.all([
    readColumns(sheet, ["'누적추이 계산용 시트(수정금지)'!A2:A", "'누적추이 계산용 시트(수정금지)'!B2:B", "'누적추이 계산용 시트(수정금지)'!C2:C"]),
    readColumns(sheet, ["'비상'!A2:A", "'비상'!B2:B", "'비상'!C2:C"]),
    readColumns(sheet, ["'열매누적'!A4:A", "'열매누적'!B4:B", "'열매누적'!C4:C", "'열매누적'!D4:D"]),
    readColumns(sheet, ["'육따기'!A2:A", "'육따기'!B2:B", "'육따기'!C2:C"]),
  ]);
  const col = (c: Cell[][]) => c[0] ?? [];

  const months = new Map<string, ZoneMonth>();
  const zones = new Set<string>();
  function add(year: string, month: string, week: number, zoneCell: Cell, metric: ZoneMetric, n: number) {
    const zone = zoneOf(zoneCell);
    if (Number(year) < FIRST_YEAR || !zone || !TEAMS.has(Number(zone.split("-")[0]))) return;
    const id = `${year}-${month}`;
    let m = months.get(id);
    if (!m) {
      const { label, order } = describeCourse(month);
      m = { id, label: label.replace(" 개강", ""), order: Number(year) * 100 + order, weeks: new Map() };
      months.set(id, m);
    }
    const byZone = m.weeks.get(week) ?? new Map<string, ZoneCounts>();
    m.weeks.set(week, byZone);
    const counts = byZone.get(zone) ?? emptyCounts();
    byZone.set(zone, counts);
    counts[metric] += n;
    zones.add(zone);
  }

  // 날짜(일련번호) → 주차 이름: 타찾 보고 날짜·비상 컨펌 날짜에 적힌 주차 중 가장 많이 쓰인 것
  const votes = new Map<number, Map<string, number>>();
  const vote = (date: Cell, week: Cell) => {
    if (typeof date !== "number" || !WEEK_PATTERN.test(text(week))) return;
    const byWeek = votes.get(Math.floor(date)) ?? new Map<string, number>();
    byWeek.set(text(week), (byWeek.get(text(week)) ?? 0) + 1);
    votes.set(Math.floor(date), byWeek);
  };
  col(tDate).forEach((d, i) => vote(d, col(tWeek)[i]));
  col(bDate).forEach((d, i) => vote(d, col(bWeek)[i]));
  const weekOfDate = new Map([...votes].map(([d, byWeek]) => [d, [...byWeek].sort((a, b) => b[1] - a[1])[0][0]]));
  // 기록이 없는 날(주말 등)은 가장 가까운 이전 날짜의 주차 (최대 6일 전까지)
  const weekOn = (date: number) => {
    for (let back = 0; back <= 6; back++) {
      const w = weekOfDate.get(Math.floor(date) - back);
      if (w) return w;
    }
    return null;
  };

  // 타찾
  col(tWeek).forEach((w, i) => {
    const m = text(w).match(WEEK_PATTERN);
    if (m) add(m[1], m[2], Number(m[3]), col(tZone)[i], "tachat", 1);
  });
  // 상담
  col(bWeek).forEach((w, i) => {
    const m = text(w).match(WEEK_PATTERN);
    if (m) add(m[1], m[2], Number(m[3]), col(bZone)[i], "sangdam", 1);
  });
  // 상예 (입력 날짜 → 주차)
  col(fRegion).forEach((region, i) => {
    const date = col(fDate)[i];
    if (text(region) !== "새빛" || typeof date !== "number" || text(col(fStage)[i]).startsWith("찾기")) return;
    const m = weekOn(date)?.match(WEEK_PATTERN);
    if (m) add(m[1], m[2], Number(m[3]), col(fZone)[i], "sangye", 1);
  });
  // 따기 (육따기, 한 줄 = 0.5명)
  col(yCourse).forEach((c, i) => {
    const cm = text(c).match(/^(\d+)년\s*([\d.]+)월$/);
    const wm = text(col(yWeek)[i]).match(/(\d+)\s*주차/);
    if (cm && wm) add(cm[1], cm[2], Number(wm[1]), col(yZone)[i], "yuk", 0.5);
  });

  const byZoneId = (a: string, b: string) => {
    const [at, az] = a.split("-").map(Number);
    const [bt, bz] = b.split("-").map(Number);
    return at - bt || az - bz;
  };
  return {
    months: [...months.values()].sort((a, b) => a.order - b.order),
    zones: [...zones].sort(byZoneId),
  };
}

// 여러 주차를 구역별로 합침
export function sumWeeks(weeks: Iterable<Map<string, ZoneCounts>>) {
  const total = new Map<string, ZoneCounts>();
  for (const byZone of weeks) {
    for (const [zone, c] of byZone) {
      const t = total.get(zone) ?? emptyCounts();
      for (const k of ZONE_METRIC_KEYS) t[k] += c[k];
      total.set(zone, t);
    }
  }
  return total;
}

// 값이 큰 순서의 순위 (같은 값은 같은 순위: 10, 8, 8, 5 → 1, 2, 2, 4)
export function rankOf(values: Map<string, number>) {
  const sorted = [...values.values()].sort((a, b) => b - a);
  return new Map([...values].map(([k, v]) => [k, sorted.indexOf(v) + 1]));
}
