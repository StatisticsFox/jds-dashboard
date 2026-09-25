"use server";

import { redirect } from "next/navigation";
import { logEvent } from "@/lib/access-log";
import { findAllowedPerson, normalizeEmail } from "@/lib/allowlist";
import { getCurrentUser } from "@/lib/dal";
import { sendLoginCode } from "@/lib/mailer";
import { allow } from "@/lib/rate-limit";
import {
  checkPendingCode,
  clearPendingLogin,
  createSession,
  deleteSession,
  generateCode,
  getPendingEmail,
  startPendingLogin,
} from "@/lib/session";

export type LoginState = { step: "email" | "code"; email?: string; message?: string; error?: string };

// 1단계: 이메일 입력 → 허용된 사람이면 코드 발송
// 허용 여부와 관계없이 같은 안내를 보여줘서, 명단에 누가 있는지 알아낼 수 없게 함
async function requestCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { step: "email", email, error: "이메일 주소를 확인해 주세요." };
  }
  if (!allow(`send:${email}`, 1, 60_000) || !allow(`send-hour:${email}`, 5, 3_600_000)) {
    return { step: "email", email, error: "잠시 후 다시 시도해 주세요. (1분에 한 번, 1시간에 5번까지)" };
  }

  const code = generateCode();
  const person = await findAllowedPerson(email);
  // 기록에는 등록 여부를 남기지만, 화면에는 똑같은 안내를 보여줌
  await logEvent({ email, name: person?.name, action: person ? "코드 요청" : "코드 요청(미등록)", path: "/login" });
  if (person) {
    try {
      await sendLoginCode(email, code);
    } catch (error) {
      console.error(error);
      return { step: "email", email, error: "메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요." };
    }
  }
  // 명단에 없는 사람에게도 '확인 대기' 상태는 만들어 줌 (코드는 보내지 않으므로 절대 통과 못 함)
  await startPendingLogin(email, code);
  return {
    step: "code",
    email,
    message: "등록된 이메일이라면 코드를 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.",
  };
}

// 2단계: 코드 확인 → 맞으면 로그인
async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pendingEmail = await getPendingEmail();
  if (!pendingEmail) {
    return { step: "email", error: "코드 입력 시간이 지났어요. 코드를 다시 받아 주세요." };
  }
  if (!allow(`verify:${pendingEmail}`, 5, 10 * 60_000)) {
    return { step: "code", email: pendingEmail, error: "너무 많이 틀렸어요. 10분 뒤에 코드를 다시 받아 주세요." };
  }

  const email = await checkPendingCode(String(formData.get("code") ?? ""));
  const person = email ? await findAllowedPerson(email) : null;
  if (!email || !person) {
    await logEvent({ email: pendingEmail, action: "로그인 실패", path: "/login" });
    return { step: "code", email: pendingEmail, error: "코드가 맞지 않아요. 메일에 온 8자리 코드를 확인해 주세요." };
  }

  await clearPendingLogin();
  await createSession(email);
  await logEvent({ email, name: person.name, action: "로그인", path: "/login" });
  redirect("/");
}

// 코드 입력 화면에서 '이메일 다시 입력'
async function restart(): Promise<LoginState> {
  await clearPendingLogin();
  return { step: "email" };
}

// 로그인 화면의 폼 하나가 이 함수 하나로 단계를 오감 (intent: send | verify | restart)
export async function loginStep(prev: LoginState, formData: FormData): Promise<LoginState> {
  switch (formData.get("intent")) {
    case "send":
      return requestCode(prev, formData);
    case "verify":
      return verifyCode(prev, formData);
    default:
      return restart();
  }
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) await logEvent({ email: user.email, name: user.name, action: "로그아웃" });
  await deleteSession();
  redirect("/login");
}
