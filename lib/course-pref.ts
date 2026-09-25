// 탭을 옮겨도 고른 개강을 유지하기 위한 쿠키 (값 예: "43-9")
// proxy.ts가 주소의 개강 선택(?c=43-9, 팀별 유월율은 ?course=43년 9월)을 보고 저장하고,
// 각 페이지는 주소에 개강이 없을 때 이 값을 기본으로 씀
export const COURSE_PREF_COOKIE = "pref_course";
const ID = /^\d+-[\d.]+$/;

// 요청 주소에서 '개강 하나를 고른 것'이면 그 개강 id, 아니면 null
export function courseFromSearch(search: URLSearchParams): string | null {
  const cs = search.getAll("c");
  if (cs.length === 1 && ID.test(cs[0])) return cs[0];
  const m = (search.get("course") ?? "").match(/^(\d+)년\s*([\d.]+)월$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export async function preferredCourse(): Promise<string | undefined> {
  const { cookies } = await import("next/headers");
  const v = (await cookies()).get(COURSE_PREF_COOKIE)?.value;
  return v && ID.test(v) ? v : undefined;
}
