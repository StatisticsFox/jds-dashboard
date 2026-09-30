// 새빛지역 팀 번호와, 시트의 팀-구역 칸("3-2" → 3팀)을 읽는 공용 도구
export const TEAM_IDS = [1, 2, 3, 4, 5, 6, 7] as const;

// "3-2" 같은 팀-구역 칸 → 3. 형식이 다르면 null
export const teamOf = (v: unknown) => Number(String(v ?? "").trim().match(/^(\d+)-/)?.[1]) || null;

// 주소의 ?t=3 → 3, 없거나 1~7이 아니면 undefined(전체 팀)
export function pickTeam(params: Record<string, string | string[] | undefined>) {
  const team = TEAM_IDS.find((t) => String(t) === params.t);
  return { team, teamLabel: team ? `${team}팀` : "전체 팀", teamQuery: team ? { t: team } : {} };
}
