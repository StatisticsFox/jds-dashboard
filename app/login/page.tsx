import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getPendingEmail } from "@/lib/session";
import { LoginForm } from "./LoginForm";
import { Spotlight } from "./Spotlight";

export const metadata: Metadata = { title: "Sign in" };

// 로그인 화면: 어떤 서비스인지 알 수 없도록 이름·캐릭터·설명 없이 최소한만 보여줌
export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  // 코드를 받아 둔 상태에서 새로고침하면 코드 입력 화면을 그대로 보여줌
  const pendingEmail = await getPendingEmail();

  return (
    <main className="auth flex min-h-dvh flex-1 flex-col items-center justify-center px-5 py-16">
      <div className="auth-grid" />
      <div className="auth-glow left-[-12rem] top-[-14rem] bg-[#5b6cff]" />
      <div className="auth-glow bottom-[-16rem] right-[-12rem] bg-[#19c3a4] [animation-delay:-9s]" />

      <Spotlight className="auth-card w-full max-w-[380px] px-7 py-9 sm:px-9">
        <LogoMark />
        <h1 className="mt-7 text-[22px] font-semibold tracking-tight">로그인</h1>
        <p className="mt-1.5 mb-7 text-sm text-[var(--auth-muted)]">등록된 이메일로 일회용 코드를 보내드려요.</p>
        <LoginForm initial={pendingEmail ? { step: "code", email: pendingEmail } : { step: "email" }} />
      </Spotlight>

      <p className="mt-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--auth-muted)]/70">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgb(52_211_153/0.8)]" />
        Restricted access
      </p>
    </main>
  );
}

// 이름 없는 추상 로고 (겹친 두 고리)
function LogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="35" height="35" rx="10" fill="rgb(255 255 255 / 0.04)" stroke="rgb(255 255 255 / 0.12)" />
      <circle cx="15" cy="18" r="6.5" stroke="#eceef1" strokeWidth="1.6" />
      <circle cx="21" cy="18" r="6.5" stroke="#eceef1" strokeOpacity="0.45" strokeWidth="1.6" />
    </svg>
  );
}
