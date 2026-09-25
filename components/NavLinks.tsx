"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "팀별 유월율" },
  { href: "/trend", label: "열매 추이" },
  { href: "/channels", label: "섭외유형" },
];

// 상단 메뉴 링크. 지금 보고 있는 페이지는 민트색으로 표시
export function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-3 py-1.5 ${active ? "bg-accent-soft text-accent-strong" : "text-muted hover:text-foreground"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
