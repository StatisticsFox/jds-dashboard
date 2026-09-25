import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// 로그인 쿠키가 없으면 로그인 화면으로 먼저 돌려보내는 빠른 1차 확인.
// 진짜 확인(쿠키 서명이 맞는지, 지금도 허용 명단에 있는지)은 각 페이지의 requireUser()에서 함
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // 로그인 화면, Next.js 내부 파일, 확장자가 있는 정적 파일(캐릭터 이미지·아이콘 등)은 제외
  matcher: ["/((?!login|_next/static|_next/image|.*\\..*).*)"],
};
