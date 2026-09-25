import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/dal";

// 캐릭터 이미지(프로젝트 폴더의 chongchong.jpg)를 로그인한 사람에게만 보내 줌.
// public 폴더에 두면 누구나 주소로 열 수 있어서 이 경로를 거치게 함
export async function GET() {
  if (!(await getCurrentUser())) {
    return new Response("Not found", { status: 404 });
  }
  const image = await readFile(path.join(process.cwd(), "chongchong.jpg"));
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      // 이 사람의 브라우저에만 1시간 저장 (공용 캐시에는 저장 금지)
      "Cache-Control": "private, max-age=3600",
    },
  });
}
