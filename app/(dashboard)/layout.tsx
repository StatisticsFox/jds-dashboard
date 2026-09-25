import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "새빛 대시보드",
};

// 로그인 후 대시보드 영역: 업무용 테마(.app-theme)·Pretendard 글꼴·메뉴는 여기서만 적용 (로그인 화면에는 없음)
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app-theme flex min-h-dvh flex-1 flex-col lg:flex-row">
      {/* 한글 글꼴 Pretendard: 쓰는 글자 조각만 내려받는 방식 */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" precedence="default" />
      <NavBar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
