import Link from "next/link";

type LinkHref = React.ComponentProps<typeof Link>["href"];

const base = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-sm transition-colors";
const on = "border-accent bg-accent-soft font-semibold text-accent-strong";
const off = "border-border bg-surface text-muted hover:border-foreground/25 hover:text-foreground";

// 사각 선택 칩 (모든 탭 공통)
// - 하나만 고르는 목록: active만 주면 초록 테두리 + 옅은 초록 배경
// - 여러 개 고르는 목록(multi): 선택되면 앞에 ✓, dot을 주면 선 색 점도 함께
// - disabled: 누를 수 없는 칩 (예: 최대 개수 초과)
export function Chip({
  href,
  active = false,
  multi = false,
  dot,
  disabled = false,
  title,
  children,
}: {
  href: LinkHref;
  active?: boolean;
  multi?: boolean;
  dot?: string;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className={`${base} cursor-not-allowed border-border text-muted/40`} title={title}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-current={active ? "true" : undefined} aria-pressed={multi ? active : undefined} title={title} className={`${base} ${active ? on : off}`}>
      {multi && active && <span aria-hidden>✓</span>}
      {dot && active && <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden />}
      {children}
    </Link>
  );
}

// 칩 한 줄 + 왼쪽 라벨 (예: "43년 개강  [1월] [2월] …")
export function ChipRow({ label, children, className = "" }: { label?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {label && <span className="mr-1.5 min-w-14 text-xs font-medium text-muted">{label}</span>}
      {children}
    </div>
  );
}
