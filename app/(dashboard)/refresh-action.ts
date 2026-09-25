"use server";

import { updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { SHEETS_TAG } from "@/lib/data-time";

// 새로고침 버튼: 저장해 둔 시트 데이터를 지워서 지금 페이지가 시트를 바로 다시 읽게 함.
// 서버 액션은 누구나 호출할 수 있는 주소라 로그인한 사람인지 먼저 확인
export async function refreshData() {
  if (!(await getCurrentUser())) throw new Error("로그인이 필요해요.");
  updateTag(SHEETS_TAG);
}
