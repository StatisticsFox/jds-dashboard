import { NextResponse, type NextRequest } from "next/server";
import { COURSE_PREF_COOKIE, courseFromSearch } from "@/lib/course-pref";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// 로그인 쿠키가 없으면 로그인 화면으로 먼저 돌려보내는 빠른 1차 확인.
// 진짜 확인(쿠키 서명이 맞는지, 지금도 허용 명단에 있는지)은 각 페이지의 requireUser()에서 함
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // 접속 기록용: 지금 주소를 서버 컴포넌트에서 읽을 수 있게 요청 헤더로 넘김
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // 개강을 하나 고른 주소면 기억해 두기 (다른 탭에서 기본으로 사용)
  const course = courseFromSearch(request.nextUrl.searchParams);
  if (course) response.cookies.set(COURSE_PREF_COOKIE, course, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true });
  return response;
}

export const config = {
  // 로그인 화면, Next.js 내부 파일, 확장자가 있는 정적 파일(캐릭터 이미지·아이콘 등)은 제외
  matcher: ["/((?!login|_next/static|_next/image|.*\\..*).*)"],
};
