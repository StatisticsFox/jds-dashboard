"use client";

// 다크/라이트 전환 버튼. 고른 값은 이 브라우저에만 저장됨
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // 저장이 막힌 브라우저에서는 이번 방문 동안만 적용
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="다크 모드 전환"
      title="다크 모드 전환"
      className="rounded-md px-2 py-1 text-xs text-muted hover:bg-background hover:text-foreground"
    >
      <span className="theme-icon-moon">🌙 다크</span>
      <span className="theme-icon-sun">☀️ 라이트</span>
    </button>
  );
}

