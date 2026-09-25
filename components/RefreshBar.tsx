"use client";

import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { refreshData } from "@/app/(dashboard)/refresh-action";

const clock = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// 1분마다 바뀌는 현재 시각 (서버에서 그릴 때는 없음 → 'n분 전'은 브라우저에서만 표시)
function useNowMinute() {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, 30_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}

function ago(at: number, nowMinute: number) {
  const min = Math.max(0, nowMinute - Math.floor(at / 60_000));
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}

// "📄 9. 25. 14:32 기준 · 3분 전  [↻ 새로고침]"
export function RefreshBar({ at }: { at: number }) {
  const nowMinute = useNowMinute();
  return (
    <form action={refreshData} className="flex flex-wrap items-center gap-2 text-xs text-muted" data-capture-ignore>
      <span title="구글 시트에서 이 시각에 읽어 온 숫자예요. 시트는 5분마다 자동으로 다시 읽어요.">
        📄 시트 {clock.format(at)} 기준{nowMinute !== null && ` · ${ago(at, nowMinute)}`}
      </span>
      <RefreshButton />
    </form>
  );
}

function RefreshButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 font-medium text-foreground hover:border-accent hover:bg-accent-soft disabled:opacity-60"
      title="시트를 지금 다시 읽어 와요"
    >
      <span className={pending ? "inline-block animate-spin" : ""}>↻</span>
      {pending ? "불러오는 중…" : "새로고침"}
    </button>
  );
}
