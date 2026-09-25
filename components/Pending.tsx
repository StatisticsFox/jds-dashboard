"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState, useTransition } from "react";

// 칩·표 줄 등을 누른 뒤 서버가 새 화면을 만드는 동안(0.5~1초) 바로 반응을 보여주기 위한 공용 상태
// - 위쪽에 얇은 진행 막대, 본문은 살짝 흐리게 (짧게 끝나면 깜빡이지 않게 약간 늦게 흐려짐)
// - 누른 링크에는 작은 로딩 표시
type Ctx = { pending: boolean; target: string | null; navigate: (url: string) => void };
const PendingContext = createContext<Ctx>({ pending: false, target: null, navigate: () => {} });

export function PendingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const navigate = useCallback(
    (url: string) => {
      setTarget(url);
      startTransition(() => router.push(url, { scroll: false }));
    },
    [router],
  );
  return (
    <PendingContext.Provider value={{ pending, target: pending ? target : null, navigate }}>
      {pending && <div className="pending-bar" aria-hidden />}
      <div data-pending={pending || undefined} className="pending-area" aria-busy={pending}>
        {children}
      </div>
    </PendingContext.Provider>
  );
}

type Href = string | { pathname?: string; query?: Record<string, unknown> };

// Link의 href(문자열 또는 { query }) → 실제 주소
function toUrl(href: Href, pathname: string) {
  if (typeof href === "string") return href;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(href.query ?? {})) {
    for (const item of [v].flat()) if (item !== undefined && item !== null && item !== false) qs.append(k, String(item));
  }
  const q = qs.toString();
  return `${href.pathname ?? pathname}${q ? `?${q}` : ""}`;
}

// 누르면 바로 반응하는 링크 (새 탭 열기 등 보조키 클릭은 원래대로)
export function PendingLink({ href, className, children, ...rest }: Omit<React.ComponentProps<typeof Link>, "href"> & { href: Href }) {
  const pathname = usePathname();
  const { navigate, target } = useContext(PendingContext);
  const url = toUrl(href, pathname);
  const loading = target === url;
  return (
    <Link
      {...rest}
      href={url}
      scroll={false}
      data-loading={loading || undefined}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(url);
      }}
    >
      {children}
      {loading && <span className="pending-spin" aria-label="불러오는 중" />}
    </Link>
  );
}
