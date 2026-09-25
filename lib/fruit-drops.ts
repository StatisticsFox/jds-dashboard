import "server-only";
import { normalizeReason, type WeekDrops } from "./drops";
import { readColumns } from "./google";
import { describeCourse, FIRST_YEAR } from "./weekly";

// '새빛 찾기 체계'의 '열매누적'(상담 예정 이상 열매)에서 목표 개강별 탈락 사유를 셈
// A 단계 | C 인도 지역 | M 목표 개강 | R 탈락 사유  (3행 머리글, 4행부터 데이터)
// 인도 지역이 채워진 행 = 열매 하나. 탈락 사유가 비어 있으면 개강에 들어간 것(진행 중 개강은 아직 진행 중)

// 탈락 단계 (진행 순서). 단계(A열) 값 → 단계:
//   "상담 예정 …" → 상예 / "상담 정파 …" → 정파 / "상담 심각·미비·보류 …", "상담 탈락" → 상담
//   "육따기 예정 …" → 육따기 예정 / "육따기 심각·미비 …", "육따기 탈락" → 육따기
//   단계가 "찾기"인 행은 열매누적에 원래 없어야 하는 값이라 집계에서 제외
export const STAGES = {
  all: "전체",
  sangye: "상예",
  jeongpa: "정파",
  sangdam: "상담",
  yukye: "육따기 예정",
  yuk: "육따기",
} as const;
export type StageFilter = keyof typeof STAGES;
export type Stage = Exclude<StageFilter, "all">;
export const STAGE_ORDER: Stage[] = ["sangye", "jeongpa", "sangdam", "yukye", "yuk"];

// 단계별로 "그 단계까지 온 열매"를 부르는 이름 (탈락률의 분모)
export const REACHED_LABEL: Record<StageFilter, string> = {
  all: "상담 예정 이상",
  sangye: "상담 예정 이상",
  jeongpa: "정파 단계 이상",
  sangdam: "상담 단계 이상",
  yukye: "육따기 예정 단계 이상",
  yuk: "육따기 열매 (A열 육따기, 예정 제외)",
};

function stageOf(raw: string): Stage | "find" | null {
  const s = raw.replace(/\s*탈락$/, "").trim();
  if (s.startsWith("상담 예정")) return "sangye";
  if (s.startsWith("상담 정파")) return "jeongpa";
  if (s.startsWith("상담")) return "sangdam";
  if (s.startsWith("육따기 예정")) return "yukye";
  if (s.startsWith("육따기")) return "yuk";
  if (s.startsWith("찾기")) return "find";
  return null;
}

// stage: A열로 본 단계(탈락 여부와 관계없이), dropped: A열에 "탈락"이 들어감, reason: R열 탈락 사유
type Fruit = { stage: Stage | null; dropped: boolean; reason: string };
export type FruitCourse = { id: string; label: string; order: number; fruits: Fruit[] };

export async function getFruitDropData() {
  const [stageCol, regionCol, courseCol, reasonCol] = await readColumns(process.env.GOOGLE_SHEET_ID!, [
    "'열매누적'!A4:A",
    "'열매누적'!C4:C",
    "'열매누적'!M4:M",
    "'열매누적'!R4:R",
  ]);
  const regions = regionCol[0] ?? [];
  const courses = new Map<string, FruitCourse>();
  const totals = new Map<string, number>();

  for (let i = 0; i < regions.length; i++) {
    if (!String(regions[i] ?? "").trim()) continue;
    const m = String(courseCol[0]?.[i] ?? "").trim().match(/^(\d+)년\s*([\d.]+)월$/);
    if (!m || Number(m[1]) < FIRST_YEAR) continue;
    const id = `${m[1]}-${m[2]}`;
    let course = courses.get(id);
    if (!course) {
      const { label, order } = describeCourse(m[2]);
      course = { id, label, order: Number(m[1]) * 100 + order, fruits: [] };
      courses.set(id, course);
    }
    const rawStage = String(stageCol[0]?.[i] ?? "").trim();
    const stage = stageOf(rawStage);
    if (stage === "find") continue; // 찾기 단계는 열매가 아님
    const reason = normalizeReason(reasonCol[0]?.[i]);
    course.fruits.push({ stage, dropped: rawStage.includes("탈락"), reason });
    if (reason) totals.set(reason, (totals.get(reason) ?? 0) + 1);
  }

  return {
    reasons: [...totals].sort((a, b) => b[1] - a[1]).map(([r]) => r),
    courses: [...courses.values()].sort((a, b) => a.order - b.order),
  };
}

// 탈락한 열매의 단계별 인원 (단계별 분포 막대용, 키는 화면 이름). 100% = 탈락한 열매
export function stageBreakdown(fruits: Fruit[]) {
  const counts = new Map<string, number>();
  for (const f of fruits) {
    if (!f.reason || !f.stage) continue;
    counts.set(STAGES[f.stage], (counts.get(STAGES[f.stage]) ?? 0) + 1);
  }
  return counts;
}

// 그 단계까지 온 열매인지
// - 육따기: A열이 "육따기"로 시작하는 열매 전부 (육따기 예정 제외)
// - 그 외: 탈락하지 않았거나, 그 단계 또는 그 뒤 단계에서 탈락
//   예) 정파 단계 이상 = 전체 - 상예 탈락, 상담 단계 이상 = 전체 - 상예 탈락 - 정파 탈락
function reached(f: Fruit, stage: StageFilter) {
  if (stage === "yuk") return f.stage === "yuk";
  if (stage === "all" || !f.reason) return true;
  return f.stage !== null && STAGE_ORDER.indexOf(f.stage) >= STAGE_ORDER.indexOf(stage);
}

// 열매 목록 → 분모(그 단계까지 온 열매 수)·그 단계 탈락 사유별 인원
export function countDrops(fruits: Fruit[], stage: StageFilter = "all"): WeekDrops {
  const reasons = new Map<string, number>();
  let finds = 0;
  for (const f of fruits) {
    if (!reached(f, stage)) continue;
    finds++;
    if (stage === "yuk") {
      // 육따기: A열에 "탈락"이 들어가면 탈락 (사유가 비어 있으면 '사유 미기재')
      if (!f.dropped) continue;
      const r = f.reason || "사유 미기재";
      reasons.set(r, (reasons.get(r) ?? 0) + 1);
      continue;
    }
    if (!f.reason || (stage !== "all" && f.stage !== stage)) continue;
    reasons.set(f.reason, (reasons.get(f.reason) ?? 0) + 1);
  }
  return { finds, reasons };
}
