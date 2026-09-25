import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { CODE_MINUTES, getPendingEmail } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  // 코드를 받아 둔 상태에서 새로고침하면 코드 입력 화면을 그대로 보여줌
  const pendingEmail = await getPendingEmail();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center">
        <h1 className="text-xl font-bold">새빛 대시보드</h1>
        <p className="mt-2 mb-6 text-sm text-muted">허용된 사람만 볼 수 있어요.</p>
        <LoginForm initial={pendingEmail ? { step: "code", email: pendingEmail } : { step: "email" }} />
        <p className="mt-6 text-xs leading-relaxed text-muted">
          이메일로 받은 코드는 {CODE_MINUTES}분 동안 쓸 수 있어요.
          <br />
          접근 권한이 필요하면 관리자에게 문의해 주세요.
        </p>
      </div>
    </main>
  );
}
