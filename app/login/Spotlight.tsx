"use client";

import { useRef } from "react";

// 마우스 위치를 CSS 변수(--mx, --my)로 넘겨서 카드 테두리의 빛이 커서를 따라다니게 함
export function Spotlight({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  return (
    <div ref={ref} onPointerMove={move} className={className}>
      {children}
    </div>
  );
}
