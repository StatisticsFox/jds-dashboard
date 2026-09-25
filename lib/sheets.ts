import "server-only";
import { readValues } from "./google";

// 열매 단계별로 어느 탭의 어느 컬럼을 읽는지
export const STAGES = {
  tachat: {
    label: "타찾",
    // 1행 헤더, 2행 빈 줄, 3행부터 데이터. 필요한 A~C열만 읽음
    range: "'누적추이 계산용 시트(수정금지)'!A1:C",
    headerRow: 0,
    dataStartRow: 2,
    dateColumn: "타찾 보고 날짜",
    teamColumn: "팀-구역",
  },
  sangye: {
    label: "상담 예정 이상",
    // 3행 헤더, 4행부터 데이터. 필요한 A~D열만 읽음
    range: "'열매누적'!A3:D",
    headerRow: 0,
    dataStartRow: 1,
    dateColumn: "입력 날짜",
    teamColumn: "인도 팀-구역",
    requiredColumn: "인도 지역", // 이 칸이 채워진 행만 열매로 셈
  },
} as const;

export type Stage = keyof typeof STAGES;

export type Fruit = {
  date: string | null; // 기준 날짜 (YYYY-MM-DD)
  teamZone: string; // 팀-구역 (예: "6-2")
  team: string | null; // 팀 (예: "6")
};

// "2025. 8. 31" → "2025-08-31", 날짜가 아니면 null
function parseDate(value: string | undefined): string | null {
  const m = value?.trim().match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

export async function getFruits(stage: Stage): Promise<Fruit[]> {
  const config: (typeof STAGES)[Stage] = STAGES[stage];
  const values = await readValues(process.env.GOOGLE_SHEET_ID!, config.range);
  const header = values[config.headerRow] ?? [];
  const rows = values.slice(config.dataStartRow);

  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`시트에 '${name}' 컬럼이 없습니다.`);
    return i;
  };
  const dateCol = col(config.dateColumn);
  const teamCol = col(config.teamColumn);
  // 필수 칸이 따로 없으면 기준 날짜가 채워진 행을 열매로 셈
  const requiredCol = "requiredColumn" in config ? col(config.requiredColumn) : dateCol;

  return rows
    .filter((r) => (r[requiredCol] ?? "").trim() !== "")
    .map((r) => {
      const teamZone = (r[teamCol] ?? "").trim();
      return {
        date: parseDate(r[dateCol]),
        teamZone,
        team: teamZone.match(/^(\d+)-\d+$/)?.[1] ?? null,
      };
    });
}
