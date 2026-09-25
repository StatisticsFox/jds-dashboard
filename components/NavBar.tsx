import Link from "next/link";
import { logout } from "@/app/login/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/dal";

// 상단 메뉴. 로그인한 사람에게만 페이지 링크와 로그아웃을 보여줌
export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-sm font-medium">
        {user ? (
          <>
            <Link href="/">팀별 유월율</Link>
            <Link href="/trend" className="text-muted hover:text-foreground">
              열매 추이
            </Link>
          </>
        ) : (
          <span>새빛 대시보드</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <>
              <span className="hidden text-xs font-normal text-muted sm:inline">{user.name}</span>
              <form action={logout}>
                <button className="rounded-md px-2 py-1 text-xs text-muted hover:bg-background hover:text-foreground">로그아웃</button>
              </form>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
