import "server-only";
import nodemailer from "nodemailer";
import { CODE_MINUTES } from "./session";

// Gmail 계정 + 앱 비밀번호로 인증 코드 메일 발송
// GMAIL_USER / GMAIL_APP_PASSWORD가 없으면: 개발 중에는 서버 로그에 코드를 찍고, 배포 환경에서는 오류
export async function sendLoginCode(to: string, code: string) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

  if (!user || !pass) {
    if (process.env.NODE_ENV === "production") throw new Error("메일 발송 설정(GMAIL_USER, GMAIL_APP_PASSWORD)이 없습니다.");
    console.log(`\n[개발용] ${to} 로그인 코드: ${code}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await transporter.sendMail({
    from: `"새빛 대시보드" <${user}>`,
    to,
    subject: `[새빛 대시보드] 로그인 코드 ${code}`,
    text: [
      `로그인 코드: ${code}`,
      "",
      `이 코드는 ${CODE_MINUTES}분 동안만 쓸 수 있어요.`,
      "직접 요청하지 않았다면 이 메일은 무시해 주세요.",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px">새빛 대시보드 로그인</h2>
        <p style="color:#52514e;margin:0 0 20px">아래 코드를 로그인 화면에 입력해 주세요.</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;background:#f5f5f4;border-radius:8px;padding:16px;text-align:center">${code}</div>
        <p style="color:#52514e;font-size:13px;margin:20px 0 0">
          이 코드는 ${CODE_MINUTES}분 동안만 쓸 수 있어요.<br>직접 요청하지 않았다면 이 메일은 무시해 주세요.
        </p>
      </div>`,
  });
}
