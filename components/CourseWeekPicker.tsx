import Link from "next/link";
import { Star } from "@/components/Mascot";

type PickCourse = { id: string; label: string; weeks: Map<number, unknown> };
export type WeekChoice = number | "all";

// 주소(?c=43-9&w=8|all)에서 개강 하나·주차 하나를 고름.
// 없으면 가장 최근 개강, 그 개강의 가장 최근(작은) 주차
export function selectCourseWeek<T extends PickCourse>(courses: T[], params: Record<string, string | string[] | undefined>) {
  const course = courses.find((c) => c.id === params.c) ?? courses.at(-1);
  const weeks = course ? [...course.weeks.keys()].sort((a, b) => b - a) : [];
  const week: WeekChoice | undefined = params.w === "all" ? "all" : (weeks.find((w) => String(w) === params.w) ?? weeks.at(-1));
  return { course, weeks, week, weekLabel: week === "all" ? "전체 주차" : `${week}주차` };
}

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm transition-colors ${
    on ? "border-transparent bg-accent font-semibold text-accent-ink shadow-sm" : "border-border text-muted hover:border-accent hover:bg-accent-soft hover:text-foreground"
  }`;

// 개강 칩 한 줄 + 주차 칩 한 줄 (섭외유형·탈락사유 탭 공용)
export function CourseWeekPicker({ courses, course, weeks, week }: { courses: PickCourse[]; course?: PickCourse; weeks: number[]; week?: WeekChoice }) {
  return (
    <section className="card space-y-5 p-5">
      <div className="space-y-2.5">
        <h2 className="flex items-center gap-2 text-xl">
          <Star size={20} /> 개강
        </h2>
        <div className="flex flex-wrap gap-2">
          {courses.map((c) => {
            // 개강을 바꾸면 같은 주차가 있으면 유지, 없으면 그 개강의 기본 주차
            const keepWeek = week === "all" || (week !== undefined && c.weeks.has(week)) ? String(week) : undefined;
            return (
              <Link key={c.id} href={{ query: { c: c.id, ...(keepWeek && { w: keepWeek }) } }} scroll={false} aria-current={c.id === course?.id} className={chip(c.id === course?.id)}>
                {c.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="space-y-2.5 border-t border-grid pt-4">
        <h2 className="flex items-center gap-2 text-xl">
          <Star size={20} /> 주차
        </h2>
        <div className="flex flex-wrap gap-2">
          {[...weeks.map(String), "all"].map((w) => (
            <Link key={w} href={{ query: { c: course?.id, w } }} scroll={false} aria-current={String(week) === w} className={chip(String(week) === w)}>
              {w === "all" ? "전체" : `${w}주차`}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
