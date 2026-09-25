import "server-only";
import { readValues } from "./google";

// 접속을 허용할 사람 명단
// 1) 허용 명단 스프레드시트의 '허용' 탭: A열 이메일, B열 이름 (1행은 머리글)
// 2) 환경변수 ALLOWED_EMAILS (쉼표로 구분) — 시트와 관계없이 항상 허용
// 시트에서 행을 지우면 최대 1분 안에 그 사람은 더 이상 볼 수 없게 됨

const TAB = "허용";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type AllowedPerson = { email: string; name: string };

export async function getAllowedPeople(): Promise<AllowedPerson[]> {
  const people = new Map<string, AllowedPerson>();

  for (const email of (process.env.ALLOWED_EMAILS ?? "").split(",").map(normalizeEmail).filter(Boolean)) {
    people.set(email, { email, name: "" });
  }

  const sheetId = process.env.ALLOWLIST_SHEET_ID;
  if (sheetId) {
    const rows = await readValues(sheetId, `'${TAB}'!A2:B`, 60);
    for (const [rawEmail = "", name = ""] of rows) {
      const email = normalizeEmail(rawEmail);
      if (email.includes("@")) people.set(email, { email, name: name.trim() });
    }
  }
  return [...people.values()];
}

export async function findAllowedPerson(email: string) {
  return (await getAllowedPeople()).find((p) => p.email === normalizeEmail(email)) ?? null;
}
