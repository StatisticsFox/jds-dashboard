"use client";

import { useActionState } from "react";
import { loginStep, type LoginState } from "./actions";

const input = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-foreground";
const primary = "w-full rounded-md bg-foreground px-4 py-2.5 font-medium text-background disabled:opacity-50";

export function LoginForm({ initial }: { initial: LoginState }) {
  const [state, action, pending] = useActionState(loginStep, initial);

  if (state.step === "email") {
    return (
      <form action={action} className="space-y-3 text-left">
        <input type="hidden" name="intent" value="send" />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">이메일</span>
          <input
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            defaultValue={state.email}
            placeholder="name@example.com"
            className={input}
          />
        </label>
        {state.error && <p className="text-sm text-bad">{state.error}</p>}
        <button disabled={pending} className={primary}>
          {pending ? "보내는 중…" : "인증 코드 받기"}
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-3 text-left">
      <p className="rounded-md bg-background px-3 py-2 text-sm text-muted">
        <span className="font-medium text-foreground">{state.email}</span>
        <br />
        {state.message ?? "메일로 받은 인증 코드를 입력해 주세요."}
      </p>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">인증 코드 (8자리)</span>
        <input
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ABCD-EFGH"
          className={`${input} text-center font-mono text-xl tracking-widest uppercase`}
        />
      </label>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <button name="intent" value="verify" disabled={pending} className={primary}>
        {pending ? "확인 중…" : "로그인"}
      </button>
      <button
        name="intent"
        value="restart"
        formNoValidate
        disabled={pending}
        className="w-full text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
      >
        이메일 다시 입력 / 코드 다시 받기
      </button>
    </form>
  );
}
