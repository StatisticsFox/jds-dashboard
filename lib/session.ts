import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./session-cookie";

// 로그인 상태와 '코드 확인 대기' 상태를 모두 서명된 쿠키에 저장 (DB 없음)
// 쿠키 내용은 AUTH_SECRET으로 서명돼서 브라우저에서 고치면 무효가 됨

const PENDING_COOKIE = "login_pending";
const SESSION_DAYS = 7;
export const CODE_MINUTES = 10;

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET이 설정되지 않았습니다.");
  return new TextEncoder().encode(s);
};

const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true, // 자바스크립트에서 읽을 수 없음
  secure: process.env.NODE_ENV === "production", // 배포 환경에서는 https에서만 전송
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

async function sign(payload: Record<string, unknown>, expiresInSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secret());
}

async function verify(token: string | undefined) {
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret(), { algorithms: ["HS256"] })).payload;
  } catch {
    return null; // 서명이 틀리거나 만료됨
  }
}

// ── 인증 코드 ─────────────────────────────────────────────
// 헷갈리는 글자(0/O, 1/I/L)를 뺀 32글자 × 8자리 ≈ 1조 가지 → 무작위로 맞히기 불가능
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode() {
  const raw = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

// 입력한 코드에서 공백·하이픈을 지우고 대문자로
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

const hashCode = (email: string, code: string) =>
  createHash("sha256").update(`${email}:${normalizeCode(code)}:`).update(secret()).digest("hex");

// 코드를 보낸 뒤: 코드 자체가 아니라 해시만 쿠키에 저장
export async function startPendingLogin(email: string, code: string) {
  const token = await sign({ email, codeHash: hashCode(email, code) }, CODE_MINUTES * 60);
  (await cookies()).set(PENDING_COOKIE, token, cookieOptions(CODE_MINUTES * 60));
}

export async function getPendingEmail() {
  const payload = await verify((await cookies()).get(PENDING_COOKIE)?.value);
  return typeof payload?.email === "string" ? payload.email : null;
}

// 입력한 코드가 맞으면 이메일을 돌려줌
export async function checkPendingCode(code: string) {
  const payload = await verify((await cookies()).get(PENDING_COOKIE)?.value);
  if (typeof payload?.email !== "string" || typeof payload.codeHash !== "string") return null;
  const expected = Buffer.from(payload.codeHash, "hex");
  const actual = Buffer.from(hashCode(payload.email, code), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? payload.email : null;
}

export async function clearPendingLogin() {
  (await cookies()).delete(PENDING_COOKIE);
}

// ── 로그인 세션 ───────────────────────────────────────────
export async function createSession(email: string) {
  const token = await sign({ email }, SESSION_DAYS * 24 * 60 * 60);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 24 * 60 * 60));
}

export async function getSessionEmail() {
  const payload = await verify((await cookies()).get(SESSION_COOKIE)?.value);
  return typeof payload?.email === "string" ? payload.email : null;
}

// ── 마스터코드 ────────────────────────────────────────────
// 이메일 없이 들어오는 공용 코드. 값은 코드에 적지 않고 환경변수 MASTER_CODE에만 둠 (없으면 기능 꺼짐)
// 세션에는 '지금 마스터코드의 지문'을 넣어 두어서, 환경변수 값을 바꾸면 예전 코드로 들어온 사람은 모두 로그아웃됨
const masterFingerprint = () => {
  const code = normalizeCode(process.env.MASTER_CODE ?? "");
  return code ? createHash("sha256").update(`master:${code}:`).update(secret()).digest("hex") : null;
};

export function checkMasterCode(code: string) {
  const expected = masterFingerprint();
  if (!expected || !normalizeCode(code)) return false;
  const actual = createHash("sha256").update(`master:${normalizeCode(code)}:`).update(secret()).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

export async function createMasterSession() {
  const token = await sign({ master: masterFingerprint() }, SESSION_DAYS * 24 * 60 * 60);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 24 * 60 * 60));
}

// 마스터코드로 들어왔고, 그 코드가 지금도 유효한지
export async function isMasterSession() {
  const payload = await verify((await cookies()).get(SESSION_COOKIE)?.value);
  const current = masterFingerprint();
  return Boolean(current && typeof payload?.master === "string" && payload.master === current);
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
