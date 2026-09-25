import Link from "next/link";
import { logout } from "@/app/login/actions";
import { Mascot } from "@/components/Mascot";
import { SidebarNav } from "@/components/SidebarNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/dal";

// 대시보드 메뉴 (넓은 화면은 왼쪽 사이드바, 좁은 화면은 위쪽 막대)
export async function NavBar() {
  const user = await getCurrentUser();

  const brand = (
    <Link href="/" className="flex items-center gap-2.5">
      <Mascot size={28} />
      <span className="font-logo text-lg leading-none">새빛 대시보드</span>
    </Link>
  );
  const footer = (
    <div className="flex items-center justify-between gap-2 px-1 text-xs">
      <span className="truncate text-muted" title={user?.email}>
        {user?.name}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <form action={logout}>
          <button className="rounded-md px-2 py-1 text-muted hover:bg-background hover:text-foreground">로그아웃</button>
        </form>
      </div>
    </div>
  );
  return <SidebarNav admin={Boolean(user?.admin)} brand={brand} footer={footer} />;
}
