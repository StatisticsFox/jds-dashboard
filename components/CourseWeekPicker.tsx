import { Chip, ChipRow } from "@/components/Chip";

type PickCourse = { id: string; label: string; weeks: Map<number, unknown> };
export type WeekChoice = number | "all";

// 주소(?c=43-9&w=8|all)에서 개강 하나·주차 하나를 고름.
// 주소에 개강이 없으면 다른 탭에서 고른 개강(pref), 그것도 없으면 가장 최근 개강. 주차는 그 개강의 가장 최근(작은) 주차
export function selectCourseWeek<T extends PickCourse>(courses: T[], params: Record<string, string | string[] | undefined>, pref?: string) {
  const course = courses.find((c) => c.id === params.c) ?? courses.find((c) => c.id === pref) ?? courses.at(-1);
  const weeks = course ? [...course.weeks.keys()].sort((a, b) => b - a) : [];
  const week: WeekChoice | undefined = params.w === "all" ? "all" : (weeks.find((w) => String(w) === params.w) ?? weeks.at(-1));
  return { course, weeks, week, weekLabel: week === "all" ? "전체 주차" : `${week}주차` };
}

// 개강 칩 한 줄 + 주차 칩 한 줄 (섭외유형·타찾 탈락 탭 공용)
export function CourseWeekPicker({ courses, course, weeks, week }: { courses: PickCourse[]; course?: PickCourse; weeks: number[]; week?: WeekChoice }) {
  const year = course?.id.split("-")[0] ?? "";
  return (
    <section className="card space-y-3 p-5">
      <ChipRow label={`${year}년 개강`}>
        {courses.map((c) => {
          // 개강을 바꾸면 같은 주차가 있으면 유지, 없으면 그 개강의 기본 주차
          const keepWeek = week === "all" || (week !== undefined && c.weeks.has(week)) ? String(week) : undefined;
          return (
            <Chip key={c.id} href={{ query: { c: c.id, ...(keepWeek && { w: keepWeek }) } }} active={c.id === course?.id}>
              {c.label.replace(" 개강", "")}
            </Chip>
          );
        })}
      </ChipRow>
      <ChipRow label="주차" className="border-t border-grid pt-3">
        {[...weeks.map(String), "all"].map((w) => (
          <Chip key={w} href={{ query: { c: course?.id, w } }} active={String(week) === w}>
            {w === "all" ? "전체" : `${w}주차`}
          </Chip>
        ))}
      </ChipRow>
    </section>
  );
}
