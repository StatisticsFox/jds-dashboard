import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findAllowedPerson } from "./allowlist";
import { getSessionEmail } from "./session";

export type CurrentUser = { email: string; name: string };

// 로그인한 사람. 세션 쿠키가 유효하고 지금도 허용 명단에 있어야 함
// (명단에서 빠지면 로그인 쿠키가 남아 있어도 바로 막힘). 한 요청 안에서는 결과를 재사용
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const email = await getSessionEmail();
  if (!email) return null;
  const person = await findAllowedPerson(email);
  return person ? { email: person.email, name: person.name || person.email } : null;
});

// 데이터를 보여주는 모든 페이지 맨 앞에서 호출
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
