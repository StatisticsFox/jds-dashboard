import "server-only";
import { readValues } from "./google";

// '43년 센터등록 명단 및 유월율, 교사현황' 파일 → '43년 센등 명단, 유월율' 탭 J열~M열 표
// (J62 머리글: 월 | 육따기 최대 수치 | OT | 센터등록, 63행부터 1월·2월… 마지막 줄 '평균')
// 아직 집계 전인 칸은 "-" → null
export type OtStats = { yukMax: number | null; ot: number | null; center: number | null };

const TAB = "43년 센등 명단, 유월율";
const YEAR = 43;

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return String(v ?? "").trim() && Number.isFinite(n) && /\d/.test(String(v)) ? n : null;
};

// 개강 id("43-9") → 수치
export async function getOtStats(): Promise<Map<string, OtStats>> {
  const id = process.env.OT_SHEET_ID;
  if (!id) return new Map();
  const rows = await readValues(id, `'${TAB}'!J63:M90`);
  const stats = new Map<string, OtStats>();
  for (const [month, yukMax, ot, center] of rows) {
    const m = String(month ?? "").trim().match(/^([\d.]+)월$/);
    if (!m) continue; // '평균' 줄 등
    stats.set(`${YEAR}-${m[1]}`, { yukMax: num(yukMax), ot: num(ot), center: num(center) });
  }
  return stats;
}
