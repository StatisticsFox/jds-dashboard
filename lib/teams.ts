// 새빛지역 팀 번호와, 시트의 팀-구역 칸("3-2" → 3팀)을 읽는 공용 도구
export const TEAM_IDS = [1, 2, 3, 4, 5, 6, 7] as const;

// 팀-구역 칸 → "3-2". 시트가 "5-3"을 날짜(5월 3일)로 바꿔 저장한 칸(날짜 일련번호)은 월-일로 되돌림. 형식이 다르면 null
export function zoneOf(v: unknown): string | null {
  if (typeof v === "number" && v > 30000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86_400_000);
    return `${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  }
  const s = String(v ?? "").trim();
  // 화면에 보이는 글자로 읽은 경우 날짜로 바뀐 칸은 "2026. 5. 3" 모양
  const date = s.match(/^\d{4}\.\s*(\d+)\.\s*(\d+)\.?$/);
  if (date) return `${Number(date[1])}-${Number(date[2])}`;
  const m = s.match(/^(\d+)\s*-\s*(\d+)/);
  return m ? `${Number(m[1])}-${Number(m[2])}` : null;
}

// 팀-구역 칸 → 팀 번호 3. 형식이 다르면 null
export const teamOf = (v: unknown) => Number(zoneOf(v)?.split("-")[0]) || null;

// 주소의 ?t=3&t=5 → [3, 5] (팀 번호 순, 중복·잘못된 값 제외). 없으면 [] (전체 팀)
export function pickTeams(params: Record<string, string | string[] | undefined>) {
  const raw = [params.t ?? []].flat();
  return TEAM_IDS.filter((t) => raw.includes(String(t)));
}

// 주소의 ?t=3 → 3, 없거나 1~7이 아니면 undefined(전체 팀)
export function pickTeam(params: Record<string, string | string[] | undefined>) {
  const team = TEAM_IDS.find((t) => String(t) === params.t);
  return { team, teamLabel: team ? `${team}팀` : "전체 팀", teamQuery: team ? { t: team } : {} };
}
