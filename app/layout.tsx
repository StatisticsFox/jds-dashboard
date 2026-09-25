import type { Metadata } from "next";
import { Geist, Geist_Mono, Jua } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 제목·큰 숫자용 둥근 한글 글꼴
const jua = Jua({
  variable: "--font-jua",
  weight: "400",
  preload: false,
});

// 페이지가 그려지기 전에 저장된 테마를 적용해서 깜빡임을 막는 스크립트
const themeInitScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  // 로그인 전에도 보이는 값이라 서비스 이름을 넣지 않음 (대시보드 안에서는 (dashboard)/layout.tsx가 덮어씀)
  title: "Sign in",
  // 검색엔진에 노출하지 않음
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${jua.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
