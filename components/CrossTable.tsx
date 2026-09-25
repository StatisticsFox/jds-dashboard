"use client";

import { useId, useRef, useState } from "react";

type Hover = { r: string; c: string; tip?: string; x: number; y: number };

// 표·히트맵 십자 강조 + 즉시 뜨는 툴팁
// 표의 칸에 data-r(행 번호)·data-c(열 번호)·data-tip(툴팁 글자, 줄바꿈은 \n)을 달아 두면,
// 칸에 마우스를 올리거나(휴대폰은 톡 누르면) 그 행과 열만 또렷하고 나머지는 흐려지며 칸 위에 툴팁이 뜸.
// 머리글 칸은 열 머리글 data-r="h", 행 머리글 data-c="h"
export function CrossTable({ children }: { children: React.ReactNode }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  function onOver(e: React.PointerEvent) {
    const cell = (e.target as Element).closest<HTMLElement>("[data-r][data-c]");
    if (!cell || !box.current?.contains(cell)) return;
    const { r = "", c = "", tip } = cell.dataset;
    if (hover && hover.r === r && hover.c === c) return;
    const b = box.current.getBoundingClientRect();
    const rc = cell.getBoundingClientRect();
    setHover({ r, c, tip, x: Math.min(Math.max(rc.left - b.left + rc.width / 2, 80), b.width - 80), y: rc.top - b.top });
  }

  const css = hover
    ? `[data-cross="${id}"] [data-r]:not([data-r="${hover.r}"]):not([data-c="${hover.c}"]){opacity:.38;transition:opacity .12s}` +
      `[data-cross="${id}"] [data-r="${hover.r}"][data-c="${hover.c}"]{outline:2px solid var(--accent);outline-offset:-2px}` +
      `[data-cross="${id}"] [data-r="h"][data-c="${hover.c}"],[data-cross="${id}"] [data-c="h"][data-r="${hover.r}"]{color:var(--foreground);font-weight:600}`
    : "";

  return (
    <div ref={box} data-cross={id} className="relative" onPointerOver={onOver} onPointerLeave={() => setHover(null)}>
      {css && <style>{css}</style>}
      {children}
      {hover?.tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full whitespace-pre rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs leading-relaxed shadow-lg"
          style={{ left: hover.x, top: hover.y - 6 }}
        >
          {hover.tip}
        </div>
      )}
    </div>
  );
}
