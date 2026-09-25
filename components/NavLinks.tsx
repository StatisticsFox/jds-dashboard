"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "팀별 유월율" },
  { href: "/trend", label: "열매 추이" },
  { href: "/channels", label: "섭외유형" },
  { href: "/drops", label: "타찾 탈락" },
  { href: "/fruit-drops", label: "열매 탈락" },
  { href: "/center", label: "등록 분석" },
  { href: "/goals", label: "목표 달성" },
];

// 상단 메뉴 링크. 지금 보고 있는 페이지는 민트색으로 표시. 관리자에게만 "관리자" 메뉴
export function NavLinks({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  return (
    // 메뉴가 많아 좁은 화면에서는 한 줄을 유지하고 옆으로 밀어서 봄
    <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
      {[...LINKS, ...(admin ? [{ href: "/admin", label: "관리자" }] : [])].map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 ${active ? "bg-accent-soft text-accent-strong" : "text-muted hover:text-foreground"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
