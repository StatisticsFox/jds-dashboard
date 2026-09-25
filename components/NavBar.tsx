import Link from "next/link";
import { logout } from "@/app/login/actions";
import { Mascot } from "@/components/Mascot";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/dal";

// 상단 메뉴. 로그인한 사람에게만 페이지 링크와 로그아웃을 보여줌
export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <nav className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm font-medium">
        <Link href="/" className="flex items-center gap-2">
          <Mascot size={32} />
          <span className="font-cute text-lg">새빛 대시보드</span>
        </Link>
        <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">{user && <NavLinks admin={user.admin} />}</div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <>
              <span className="hidden rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent-strong sm:inline">{user.name}님</span>
              <form action={logout}>
                <button className="rounded-full px-2.5 py-1 text-xs text-muted hover:bg-background hover:text-foreground">로그아웃</button>
              </form>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
