import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import { appendRows, readValuesFresh } from "./google";

// 접속 기록: '접속 기록' 스프레드시트의 '로그' 탭에 한 줄씩 쌓음
// A 시간(한국) | B 이메일 | C 이름 | D 행동 | E 페이지 | F 기기 | G IP
// 저장은 after()로 응답을 보낸 뒤에 해서 화면이 느려지지 않음

const TAB = "로그";
const HEADER = ["시간", "이메일", "이름", "행동", "페이지", "기기", "IP"];

export const ACTIONS = ["페이지 조회", "로그인", "로그인 실패", "코드 요청", "코드 요청(미등록)", "로그아웃"] as const;
export type Action = (typeof ACTIONS)[number];

export type LogEntry = { time: string; email: string; name: string; action: string; path: string; device: string; ip: string };

// 같은 사람이 같은 페이지를 짧은 시간에 여러 번 보면(필터 클릭 등) 한 번만 기록
const VIEW_DEDUPE_MS = 5 * 60_000;
const lastViews = new Map<string, number>();
// 머리글 확인은 서버가 켜진 뒤 한 번만 (동시에 여러 기록이 저장돼도 머리글이 두 번 들어가지 않게 공유)
let headerReady: Promise<void> | null = null;

const now = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

// "Mozilla/5.0 (iPhone ...) ... Safari" → "모바일 · iOS · Safari"
function describeDevice(ua: string) {
  const kind = /iPad|Tablet/i.test(ua) ? "태블릿" : /Mobi|iPhone|Android/i.test(ua) ? "모바일" : "PC";
  const os = /iPhone|iPad|iOS/i.test(ua)
    ? "iOS"
    : /Android/i.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/i.test(ua)
        ? "Mac"
        : /Windows/i.test(ua)
          ? "Windows"
          : "기타";
  const browser = /KAKAOTALK/i.test(ua)
    ? "카카오톡"
    : /SamsungBrowser/i.test(ua)
      ? "삼성 인터넷"
      : /Edg\//i.test(ua)
        ? "Edge"
        : /Whale/i.test(ua)
          ? "웨일"
          : /Chrome|CriOS/i.test(ua)
            ? "Chrome"
            : /Firefox|FxiOS/i.test(ua)
              ? "Firefox"
              : /Safari/i.test(ua)
                ? "Safari"
                : "기타";
  return `${kind} · ${os} · ${browser}`;
}

// 지금 요청의 주소·기기·IP. after() 안에서는 headers()를 못 쓰므로 미리 읽어 둠
export async function requestInfo() {
  const h = await headers();
  return {
    path: h.get("x-pathname") ?? "",
    device: describeDevice(h.get("user-agent") ?? ""),
    ip: (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim(),
    // 링크 미리 불러오기(prefetch)는 실제 방문이 아니므로 기록하지 않음
    prefetch: h.has("next-router-prefetch") || h.get("purpose") === "prefetch",
  };
}

export async function logEvent(entry: { email: string; name?: string; action: Action; path?: string }) {
  const info = await requestInfo();
  if (entry.action === "페이지 조회") {
    if (info.prefetch) return;
    const key = `${entry.email}|${entry.path ?? info.path}`;
    const last = lastViews.get(key) ?? 0;
    if (Date.now() - last < VIEW_DEDUPE_MS) return;
    lastViews.set(key, Date.now());
  }
  const row = [now(), entry.email, entry.name ?? "", entry.action, entry.path ?? info.path, info.device, info.ip];

  after(async () => {
    const sheetId = process.env.ACCESS_LOG_SHEET_ID;
    if (!sheetId) {
      if (process.env.NODE_ENV !== "production") console.log("[접속 기록]", row.join(" | "));
      return;
    }
    try {
      // 처음 한 번: 시트가 비어 있으면 머리글부터
      headerReady ??= (async () => {
        const first = await readValuesFresh(sheetId, `'${TAB}'!A1:A1`);
        if (!first.length) await appendRows(sheetId, `'${TAB}'!A:G`, [HEADER]);
      })().catch((error) => {
        headerReady = null; // 실패하면 다음 기록 때 다시 시도
        throw error;
      });
      await headerReady;
      await appendRows(sheetId, `'${TAB}'!A:G`, [row]);
    } catch (error) {
      console.error("접속 기록 저장 실패", error);
    }
  });
}

// 한국 날짜 "YYYY-MM-DD" (daysAgo일 전)
export function koreanDate(daysAgo = 0) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date(Date.now() - daysAgo * 86_400_000));
}

// 최근 기록부터 최대 limit개
export async function getLogs(limit = 1000): Promise<LogEntry[]> {
  const sheetId = process.env.ACCESS_LOG_SHEET_ID;
  if (!sheetId) return [];
  const rows = await readValuesFresh(sheetId, `'${TAB}'!A2:G`);
  return rows
    .map(([time = "", email = "", name = "", action = "", path = "", device = "", ip = ""]) => ({ time, email, name, action, path, device, ip }))
    .filter((r) => /^\d{4}-\d{2}-\d{2}/.test(r.time)) // 머리글 등 기록이 아닌 줄 제외
    .reverse()
    .slice(0, limit);
}
