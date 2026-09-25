import "server-only";
import { cache } from "react";

// 한 번의 페이지 요청 안에서 읽은 시트 데이터 중 '가장 오래된 것'을 언제 구글에서 받아 왔는지 기록.
// 시트 응답은 5분 동안 저장해 두고 쓰기 때문에, 이 시각이 곧 화면 숫자의 기준 시각
const store = cache(() => ({ oldest: 0 }));

// 구글 응답의 Date 헤더(보낸 시각)를 기록. 저장된 응답을 다시 쓸 때도 처음 받은 시각이 그대로 남아 있음
export function noteFetched(dateHeader: string | null) {
  const t = (dateHeader && Date.parse(dateHeader)) || Date.now();
  const s = store();
  if (!s.oldest || t < s.oldest) s.oldest = t;
}

export function dataFetchedAt() {
  return store().oldest || Date.now();
}

// 새로고침 버튼으로 한 번에 지울 수 있게 시트 요청에 붙이는 이름표
export const SHEETS_TAG = "sheets";
