import "server-only";
import { getConversionData, toRates, type Counts, type Rates, type Settings } from "./conversion";
import { getCoursePeriods } from "./week-calendar";
import { describeCourse, FIRST_YEAR } from "./weekly";

// 지역 전체 유월율을 개강마다 계산 ('팀별 유월율' 탭과 같은 계산, 팀 = 지역 전체)
// 기간: '각 개강별 기간' 탭에 있는 개강은 그 기간(공식), 없는 개강은 찾기·상담 기록의 날짜↔주차로 정한 기간(추정)
//       추정 기간은 찾기 기간과 상예 기간을 같게 둠

export type CourseConversion = {
  id: string; // "43-9"
  label: string; // "9월 개강"
  settings: Settings;
  official: boolean; // 기간이 '각 개강별 기간' 탭에서 왔는지
  ongoing: boolean; // 아직 진행 중 (마지막 개강)
  counts: Counts;
  rates: Rates;
};

const EPOCH = Date.UTC(1899, 11, 30);
const iso = (serial: number) => new Date(EPOCH + serial * 86_400_000).toISOString().slice(0, 10);
const days = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

export async function getRegionConversion(): Promise<CourseConversion[]> {
  const [{ presets, count }, periods] = await Promise.all([getConversionData(), getCoursePeriods()]);
  const list = periods.filter((p) => p.year >= FIRST_YEAR);

  return list.map((p, i) => {
    const { label } = describeCourse(p.month);
    const start = iso(p.start);
    const end = iso(p.end);
    // 같은 이름("9월 개강")이고 찾기 시작일이 추정 기간과 3주 안으로 가까운 공식 기간이 있으면 그걸 씀
    const preset = presets.find((x) => x.label === label && days(x.tachatStart, start) <= 21);
    const settings: Settings = preset
      ? { tachatStart: preset.tachatStart, tachatEnd: preset.tachatEnd, sangyeStart: preset.sangyeStart, sangyeEnd: preset.sangyeEnd, course: `${p.year}년 ${p.month}월` }
      : { tachatStart: start, tachatEnd: end, sangyeStart: start, sangyeEnd: end, course: `${p.year}년 ${p.month}월` };
    const counts = count(settings);
    return { id: p.id, label, settings, official: Boolean(preset), ongoing: i === list.length - 1, counts, rates: toRates(counts) };
  });
}
