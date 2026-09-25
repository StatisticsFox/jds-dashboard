import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "새빛 대시보드",
};

// 로그인 후 대시보드 영역: 캐릭터 테마(.theme-cute)와 상단 메뉴는 여기서만 적용
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="theme-cute flex flex-1 flex-col">
      <NavBar />
      {children}
    </div>
  );
}
