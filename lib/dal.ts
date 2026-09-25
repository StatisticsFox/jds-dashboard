import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { logEvent } from "./access-log";
import { findAllowedPerson, normalizeEmail } from "./allowlist";
import { getSessionEmail } from "./session";

export type CurrentUser = { email: string; name: string; admin: boolean };

// 환경변수 ADMIN_EMAILS(쉼표로 구분)에 있는 사람만 관리자
export function isAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map(normalizeEmail).filter(Boolean).includes(normalizeEmail(email));
}

// 로그인한 사람. 세션 쿠키가 유효하고 지금도 허용 명단에 있어야 함
// (명단에서 빠지면 로그인 쿠키가 남아 있어도 바로 막힘). 한 요청 안에서는 결과를 재사용
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const email = await getSessionEmail();
  if (!email) return null;
  const person = await findAllowedPerson(email);
  return person ? { email: person.email, name: person.name || person.email, admin: isAdmin(person.email) } : null;
});

// 데이터를 보여주는 모든 페이지 맨 앞에서 호출. 들어온 기록도 여기서 남김
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await logEvent({ email: user.email, name: user.name, action: "페이지 조회" });
  return user;
}

// 관리자 페이지 맨 앞에서 호출. 관리자가 아니면 페이지가 없는 것처럼 대시보드로
export async function requireAdmin() {
  const user = await requireUser();
  if (!user.admin) redirect("/");
  return user;
}
