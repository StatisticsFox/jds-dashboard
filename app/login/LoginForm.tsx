"use client";

import { useActionState } from "react";
import { loginStep, type LoginState } from "./actions";

const label = "mb-1.5 block text-xs font-medium text-[var(--auth-muted)]";
const errorText = "flex items-start gap-1.5 text-[13px] text-[#ff8a8a]";

export function LoginForm({ initial }: { initial: LoginState }) {
  const [state, action, pending] = useActionState(loginStep, initial);

  if (state.step === "email") {
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="intent" value="send" />
        <label className="block">
          <span className={label}>이메일</span>
          <input
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            defaultValue={state.email}
            placeholder="you@example.com"
            className="auth-input px-3.5 py-2.5 text-[15px]"
          />
        </label>
        {state.error && <p className={errorText}>{state.error}</p>}
        <button disabled={pending} className="auth-button px-4 py-2.5 text-[15px]">
          {pending ? (
            <Spinner />
          ) : (
            <>
              계속하기 <span className="arrow">→</span>
            </>
          )}
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="rounded-xl border border-[var(--auth-line)] bg-white/[0.02] px-3.5 py-3 text-[13px] leading-relaxed text-[var(--auth-muted)]">
        <span className="font-mono text-[var(--auth-text)]">{state.email}</span>
        <br />
        {state.message ?? "메일로 받은 코드를 입력해 주세요."}
      </div>
      <label className="block">
        <span className={label}>일회용 코드</span>
        <input
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXX-XXXX"
          className="auth-input px-3.5 py-3 text-center font-mono text-xl tracking-[0.3em] uppercase"
        />
      </label>
      {state.error && <p className={errorText}>{state.error}</p>}
      <button name="intent" value="verify" disabled={pending} className="auth-button px-4 py-2.5 text-[15px]">
        {pending ? (
          <Spinner />
        ) : (
          <>
            로그인 <span className="arrow">→</span>
          </>
        )}
      </button>
      <button name="intent" value="restart" formNoValidate disabled={pending} className="auth-link w-full text-[13px]">
        다른 이메일 사용 · 코드 다시 받기
      </button>
    </form>
  );
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/80 align-[-2px]" />;
}
