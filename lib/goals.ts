import "server-only";
import { getCenterData } from "./center";
import { readColumns, readValues, type Cell } from "./google";
import { FIRST_YEAR, WEEK_PATTERN } from "./weekly";

// 목표 대비 달성률
// 목표: '새빛지역 상담~센터등록 명단 관리' → '목표 데이터' 탭 (2행 머리글, 3행부터 개강월 × 지역 × 팀번호)
//   단계마다 목표 열 하나를 씀: 타찾 J열, 상담예정 N열, 상담 S열, 육따기 V열, 센터등록 AB열
// 실적:
//   타찾 실질 — 새빛 찾기 체계 '누적추이 계산용 시트' B 찾기 주차 · C 팀-구역 · M 정파만남 FALSE
//   상담     — 새빛 찾기 체계 '비상' A 주차 · C 팀-구
//   상담예정 — 새빛 찾기 체계 '열매누적' M 목표 개강 · D 인도 팀-구역 (인도 지역이 있는 열매, 탈락 포함)
//   육따기   — 유월율 파일 '육따기' A 개강월 · C 팀-구역, 한 줄 = 0.5명 (유월율 탭과 같은 방식)
//   센터등록 — 센터등록 개강분석 자료 인원 (팀 정보 없음 → 지역 합계만)

// col: 목표 데이터 탭에서 쓰는 목표 열, weekly: 실적에 주차 정보가 있어 주차별 그래프를 그릴 수 있음
export const STAGES = [
  { key: "tachat", label: "타찾 실질", col: "J", weekly: true },
  { key: "sangye", label: "상담예정", col: "N", weekly: false },
  { key: "sangdam", label: "상담", col: "S", weekly: true },
  { key: "yuk", label: "육따기", col: "V", weekly: false },
  { key: "center", label: "센터등록", col: "AB", weekly: false },
] as const;
export type GoalStage = (typeof STAGES)[number]["key"];

// 열 글자 → 0부터 센 열 번호 (예: J → 9, AB → 27)
const colIndex = (col: string) => [...col].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export const TEAM_IDS = [1, 2, 3, 4, 5, 6, 7] as const;
type WeekMap = Map<number, number>; // 주차 → 인원 (목표는 누적, 실적은 그 주차 인원)
// courseId → team → stage → 주차별 값. 주차가 없는 단계는 week 0에 합계
type Store = Map<string, Map<number, Map<GoalStage, WeekMap>>>;

const text = (v: Cell) => String(v ?? "").trim();
const teamOf = (v: Cell) => Number(text(v).match(/^(\d+)-/)?.[1]) || null;
const courseIdOf = (v: Cell) => {
  const m = text(v).match(/^(\d+)년\s*([\d.]+)월/);
  return m && Number(m[1]) >= FIRST_YEAR ? `${m[1]}-${m[2]}` : null;
};

function add(store: Store, course: string, team: number, stage: GoalStage, week: number, n: number) {
  const byTeam = store.get(course) ?? new Map();
  store.set(course, byTeam);
  const byStage = byTeam.get(team) ?? new Map();
  byTeam.set(team, byStage);
  const weeks: WeekMap = byStage.get(stage) ?? new Map();
  byStage.set(stage, weeks);
  weeks.set(week, (weeks.get(week) ?? 0) + n);
}

export async function getGoalData() {
  const sheet = process.env.GOOGLE_SHEET_ID!;
  const [targetRows, [tWeek, tTeam, tJeongpa], [bWeek, bTeam], [fRegion, fTeam, fCourse], [yCourse, yTeam], center] = await Promise.all([
    readValues(process.env.CENTER_SHEET_ID!, "'목표 데이터'!A2:AB"),
    readColumns(sheet, ["'누적추이 계산용 시트(수정금지)'!B2:B", "'누적추이 계산용 시트(수정금지)'!C2:C", "'누적추이 계산용 시트(수정금지)'!M2:M"]),
    readColumns(sheet, ["'비상'!A2:A", "'비상'!C2:C"]),
    readColumns(sheet, ["'열매누적'!C4:C", "'열매누적'!D4:D", "'열매누적'!M4:M"]),
    readColumns(process.env.GOOGLE_CONVERSION_SHEET_ID!, ["'육따기'!A2:A", "'육따기'!C2:C"]),
    getCenterData(),
  ]);

  // ── 목표 ──────────────────────────────────────────────
  const targets: Store = new Map();
  const rows = targetRows.slice(1); // 첫 줄은 머리글
  for (const r of rows) {
    if (text(r[1]) !== "새빛") continue;
    const course = courseIdOf(r[0]);
    const team = Number(text(r[2]));
    if (!course || !team) continue;
    for (const st of STAGES) {
      const i = colIndex(st.col);
      const n = Number(text(r[i]));
      if (text(r[i]) && Number.isFinite(n)) add(targets, course, team, st.key, 0, n);
    }
  }

  // ── 실적 ──────────────────────────────────────────────
  const actuals: Store = new Map();
  const col = (c: Cell[][]) => c[0] ?? [];
  // 타찾 실질 (정파만남이 FALSE인 찾기)
  col(tWeek).forEach((w, i) => {
    const m = text(w).match(WEEK_PATTERN);
    const team = teamOf(col(tTeam)[i]);
    if (!m || Number(m[1]) < FIRST_YEAR || !team || col(tJeongpa)[i] !== false) return;
    add(actuals, `${m[1]}-${m[2]}`, team, "tachat", Number(m[3]), 1);
  });
  // 상담 (비상)
  col(bWeek).forEach((w, i) => {
    const m = text(w).match(WEEK_PATTERN);
    const team = teamOf(col(bTeam)[i]);
    if (!m || Number(m[1]) < FIRST_YEAR || !team) return;
    add(actuals, `${m[1]}-${m[2]}`, team, "sangdam", Number(m[3]), 1);
  });
  // 상담예정 (열매누적, 탈락 포함 전체)
  col(fRegion).forEach((region, i) => {
    const course = courseIdOf(col(fCourse)[i]);
    const team = teamOf(col(fTeam)[i]);
    if (!text(region) || !course || !team) return;
    add(actuals, course, team, "sangye", 0, 1);
  });
  // 육따기 (한 줄 = 0.5명). 개강월이 정확히 "43년 9월" 형태인 행만
  col(yCourse).forEach((c, i) => {
    const m = text(c).match(/^(\d+)년\s*(\d+)월$/);
    const team = teamOf(col(yTeam)[i]);
    if (!m || Number(m[1]) < FIRST_YEAR || !team) return;
    add(actuals, `${m[1]}-${m[2]}`, team, "yuk", 0, 0.5);
  });

  // 센터등록은 팀이 없어 지역 합계만
  const centerCount = new Map(center.map((c) => [c.id, c.people.length]));

  const courseIds = [...targets.keys()].sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    return ya - yb || ma - mb;
  });
  return { targets, actuals, centerCount, courseIds };
}

// 팀(또는 지역 전체 = 7팀 합)의 주차별 값
export function weeksOf(store: Store, course: string, stage: GoalStage, team?: number): WeekMap {
  const out: WeekMap = new Map();
  for (const t of team ? [team] : TEAM_IDS) {
    for (const [w, n] of store.get(course)?.get(t)?.get(stage) ?? []) out.set(w, (out.get(w) ?? 0) + n);
  }
  return out;
}

// 실적 누적: 가장 큰 주차부터 더해서 week 주차까지 (week가 없으면 전체)
export function cumulativeTo(actual: WeekMap, week?: number) {
  let sum = 0;
  for (const [w, n] of actual) if (week === undefined || w >= week) sum += n;
  return sum;
}

// 목표값 (목표 열 하나). 없으면 null
export function targetOf(target: WeekMap) {
  return target.size ? [...target.values()].reduce((x, y) => x + y, 0) : null;
}
