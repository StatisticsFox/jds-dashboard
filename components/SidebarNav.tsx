"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string };
type Group = { title: string; items: Item[] };

// 메뉴 묶음. 관리자 묶음은 관리자에게만
const GROUPS: Group[] = [
  {
    title: "현황",
    items: [
      { href: "/", label: "팀별 유월율" },
      { href: "/goals", label: "목표 달성" },
    ],
  },
  {
    title: "추이",
    items: [
      { href: "/trend", label: "열매 추이" },
      { href: "/channels", label: "섭외유형" },
    ],
  },
  {
    title: "탈락",
    items: [
      { href: "/drops", label: "타찾 탈락" },
      { href: "/fruit-drops", label: "열매 탈락" },
    ],
  },
  { title: "등록", items: [{ href: "/center", label: "등록 분석" }] },
];
const ADMIN: Group = { title: "관리", items: [{ href: "/admin", label: "접속 기록" }] };

function Links({ admin, onNavigate }: { admin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-5">
      {[...GROUPS, ...(admin ? [ADMIN] : [])].map((g) => (
        <div key={g.title}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = pathname === it.href;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center rounded-md px-3 py-1.5 text-sm transition-colors ${
                      active ? "bg-accent-soft font-semibold text-accent-strong" : "text-muted hover:bg-background hover:text-foreground"
                    }`}
                  >
                    {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" />}
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// 넓은 화면: 왼쪽 고정 메뉴 / 좁은 화면: 위쪽 막대 + 펼치는 메뉴
export function SidebarNav({ admin, brand, footer }: { admin: boolean; brand: React.ReactNode; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="px-5 pb-4 pt-5">{brand}</div>
        <div className="flex-1 overflow-y-auto px-3">
          <Links admin={admin} />
        </div>
        <div className="border-t border-border p-3">{footer}</div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-2.5 backdrop-blur lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="메뉴 열기"
          className="rounded-md border border-border px-2.5 py-1 text-sm text-muted hover:text-foreground"
        >
          {open ? "닫기" : "메뉴"}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[53px] z-20 max-h-[calc(100dvh-53px)] overflow-y-auto border-b border-border bg-surface px-3 py-4 shadow-lg lg:hidden">
          <Links admin={admin} onNavigate={() => setOpen(false)} />
          <div className="mt-4 border-t border-border pt-3">{footer}</div>
        </div>
      )}
    </>
  );
}
