"use client";

import { useEffect, useRef, useState } from "react";

// 고를 수 있는 테마 (색은 app/globals.css의 :root[data-theme="…"]). 점 두 개 = 배경색 · 강조색
const THEMES = [
  { id: "light", label: "라이트", colors: ["#f6f7f6", "#178a55"] },
  { id: "dark", label: "다크", colors: ["#060807", "#3fbf82"] },
  { id: "warm", label: "따뜻한 노랑", colors: ["#faf5e9", "#a8650f"] },
  { id: "cool", label: "차가운 파랑", colors: ["#f1f5fa", "#2563eb"] },
  { id: "green", label: "편안한 초록", colors: ["#ecf2ea", "#3b8a5c"] },
] as const;
type ThemeId = (typeof THEMES)[number]["id"];

// 지금 적용된 테마 (직접 고른 값이 없으면 기기 설정)
function currentTheme(): ThemeId {
  const set = document.documentElement.dataset.theme;
  if (THEMES.some((t) => t.id === set)) return set as ThemeId;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// 테마 고르기 버튼. 고른 값은 이 브라우저에만 저장됨
export function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ThemeId | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // 열려 있을 때 바깥을 누르거나 Esc를 누르면 닫힘
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: ThemeId) {
    setActive(next);
    setOpen(false);
    const apply = () => {
      document.documentElement.dataset.theme = next;
    };
    // 지원하는 브라우저에서는 화면 전체가 부드럽게 바뀌도록
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(apply);
    else apply();
    try {
      localStorage.setItem("theme", next);
    } catch {
      // 저장이 막힌 브라우저에서는 이번 방문 동안만 적용
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setActive(currentTheme());
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="화면 테마 바꾸기"
        className="rounded-md px-2 py-1 text-xs text-muted hover:bg-background hover:text-foreground"
      >
        🎨 테마
      </button>
      {open && (
        <div role="menu" aria-label="화면 테마" className="pop-in absolute bottom-full right-0 z-40 mb-2 w-40 origin-bottom-right rounded-lg border border-border bg-surface p-1 shadow-lg">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={active === t.id}
              onClick={() => choose(t.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                active === t.id ? "bg-accent-soft font-semibold text-accent-strong" : "text-foreground hover:bg-background"
              }`}
            >
              <span className="flex shrink-0 -space-x-1" aria-hidden>
                {t.colors.map((c) => (
                  <span key={c} className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: c }} />
                ))}
              </span>
              <span className="flex-1">{t.label}</span>
              {active === t.id && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
