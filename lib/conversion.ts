import "server-only";
import { readColumns, type Cell } from "./google";

// '새빛지역 팀별 유월율' 스프레드시트의 '팀별 유월율' 탭 계산을 코드로 옮긴 것

export const TEAMS = [
  { id: 1, label: "1팀", emoji: "❤️" },
  { id: 2, label: "2팀", emoji: "🧡" },
  { id: 3, label: "3팀", emoji: "💛" },
  { id: 4, label: "4팀", emoji: "🩵" },
  { id: 5, label: "5팀", emoji: "💙" },
  { id: 6, label: "6팀", emoji: "💜" },
  { id: 7, label: "7팀", emoji: "🩷" },
] as const;

export const COUNT_METRICS = [
  { key: "tachatAll", label: "타찾 전체", hint: "타찾 기간 내 타찾 보고 수" },
  { key: "tachatReal", label: "타찾 실질", hint: "타찾 전체 중 정파만남이 아닌 것" },
  { key: "sangye", label: "상예 누적", hint: "상예 기간 내 상담 예정 이상 열매" },
  { key: "sangdam", label: "상담 누적", hint: "기준 개강의 비상 명단" },
  { key: "yukCum", label: "육따기 누적", hint: "기준 개강의 육따기 명단 × 0.5" },
  { key: "yukNow", label: "육따기 현황", hint: "육따기 누적 중 탈락 제외 × 0.5" },
] as const;

export const RATE_METRICS = [
  { key: "tachatToSangye", label: "타찾 → 상예", numerator: "sangye", denominator: "tachatReal" },
  { key: "tachatToSangdam", label: "타찾 → 상담", numerator: "sangdam", denominator: "tachatReal" },
  { key: "sangyeToSangdam", label: "상예 → 상담", numerator: "sangdam", denominator: "sangye" },
  { key: "sangdamToYuk", label: "상담 → 육따기", numerator: "yukCum", denominator: "sangdam" },
  { key: "yukDefense", label: "육따기 방어율", numerator: "yukNow", denominator: "yukCum" },
] as const;

export type CountKey = (typeof COUNT_METRICS)[number]["key"];
export type RateKey = (typeof RATE_METRICS)[number]["key"];
export type Counts = Record<CountKey, number>;
export type Rates = Record<RateKey, number | null>; // 분모가 0이면 null

export type Settings = {
  tachatStart: string; // YYYY-MM-DD
  tachatEnd: string;
  sangyeStart: string;
  sangyeEnd: string;
  course: string; // 기준 개강 (예: "43년 9월")
};

export type Preset = { label: string; tachatStart: string; tachatEnd: string; sangyeStart: string; sangyeEnd: string };

const RANGES = [
  "'팀별 유월율'!B3:B7", // 시트에 저장된 현재 설정값
  "'각 개강별 기간'!A1:Z5",
  "'누적추이 계산용 시트(수정금지)'!A:A", // 타찾 보고 날짜
  "'누적추이 계산용 시트(수정금지)'!C:C", // 팀-구역
  "'누적추이 계산용 시트(수정금지)'!M:M", // 정파만남
  "'열매누적'!B:B", // 입력 날짜
  "'열매누적'!D:D", // 인도 팀-구역
  "'비상'!A:A", // 주차 (예: "43년 9월 3주차")
  "'비상'!C:C", // 팀-구
  "'육따기'!A:A", // 개강월
  "'육따기'!C:C", // 팀-구역
  "'육따기'!G:G", // 탈락여부
];

// 시트 날짜 숫자(1899-12-30부터 센 일수) ↔ "YYYY-MM-DD"
const EPOCH = Date.UTC(1899, 11, 30);
const toSerial = (date: string) => (Date.parse(`${date}T00:00:00Z`) - EPOCH) / 86_400_000;
const fromSerial = (serial: number) => new Date(EPOCH + serial * 86_400_000).toISOString().slice(0, 10);

// 시트의 "1-*" 조건: 팀-구역이 "1-"로 시작
const isTeam = (v: Cell, team: number) => typeof v === "string" && v.startsWith(`${team}-`);
// 시트의 ">=시작, <=종료" 조건: 날짜로 입력된 칸만 비교됨
const inRange = (v: Cell, start: number, end: number) => typeof v === "number" && v >= start && v <= end;
// 시트의 "43년 9월*" 조건. 단 "43년 1월"이 "43년 10월"까지 잡지 않도록 뒤에 숫자가 오면 제외
const isCourse = (v: Cell, course: string) =>
  typeof v === "string" && v.startsWith(course) && !/^\d/.test(v.slice(course.length));

export async function getConversionData() {
  const [inputs, periods, tDate, tTeam, tJeongpa, fDate, fTeam, bWeek, bTeam, yCourse, yTeam, yStatus] = await readColumns(
    process.env.GOOGLE_CONVERSION_SHEET_ID!,
    RANGES,
  );
  const [ts, te, ss, se, course] = inputs[0] ?? [];
  const defaults: Settings = {
    tachatStart: fromSerial(Number(ts)),
    tachatEnd: fromSerial(Number(te)),
    sangyeStart: fromSerial(Number(ss)),
    sangyeEnd: fromSerial(Number(se)),
    course: String(course ?? ""),
  };

  // '각 개강별 기간' 탭: "9월 개강" 제목 칸 오른쪽 열에 찾기 시작/마무리, 상예 시작/마무리
  const presets: Preset[] = [];
  periods.forEach((col, i) => {
    const values = periods[i + 1];
    if (typeof col[0] === "string" && col[0].endsWith("개강") && values?.slice(1, 5).every((v) => typeof v === "number")) {
      const [, a, b, c, d] = values as number[];
      presets.push({ label: col[0], tachatStart: fromSerial(a), tachatEnd: fromSerial(b), sangyeStart: fromSerial(c), sangyeEnd: fromSerial(d) });
    }
  });

  // 기준 개강 선택지: 육따기 명단에 나오는 개강월 (최신순)
  const courses = [...new Set(yCourse[0]?.filter((v): v is string => typeof v === "string" && /^\d+년 .*월$/.test(v)))].reverse();

  const cols = {
    tDate: tDate[0] ?? [],
    tTeam: tTeam[0] ?? [],
    tJeongpa: tJeongpa[0] ?? [],
    fDate: fDate[0] ?? [],
    fTeam: fTeam[0] ?? [],
    bWeek: bWeek[0] ?? [],
    bTeam: bTeam[0] ?? [],
    yCourse: yCourse[0] ?? [],
    yTeam: yTeam[0] ?? [],
    yStatus: yStatus[0] ?? [],
  };

  // team이 없으면 지역 전체
  function count(settings: Settings, team?: number): Counts {
    const matchTeam = (v: Cell) => team === undefined || isTeam(v, team);
    const ts = toSerial(settings.tachatStart), te = toSerial(settings.tachatEnd);
    const ss = toSerial(settings.sangyeStart), se = toSerial(settings.sangyeEnd);
    const c = { tachatAll: 0, tachatReal: 0, sangye: 0, sangdam: 0, yukCum: 0, yukNow: 0 };

    const tLen = Math.max(cols.tDate.length, cols.tTeam.length);
    for (let i = 0; i < tLen; i++) {
      if (!inRange(cols.tDate[i], ts, te) || !matchTeam(cols.tTeam[i])) continue;
      c.tachatAll++;
      if (cols.tJeongpa[i] === false) c.tachatReal++;
    }
    for (let i = 0; i < cols.fDate.length; i++) {
      if (inRange(cols.fDate[i], ss, se) && matchTeam(cols.fTeam[i])) c.sangye++;
    }
    for (let i = 0; i < cols.bWeek.length; i++) {
      if (isCourse(cols.bWeek[i], settings.course) && matchTeam(cols.bTeam[i])) c.sangdam++;
    }
    // 육따기는 인도·교육 두 사람이 한 명단을 나눠 가지므로 한 행을 0.5로 셈
    for (let i = 0; i < cols.yCourse.length; i++) {
      if (!isCourse(cols.yCourse[i], settings.course) || !matchTeam(cols.yTeam[i])) continue;
      c.yukCum += 0.5;
      if (!String(cols.yStatus[i] ?? "").includes("탈락")) c.yukNow += 0.5;
    }
    return c;
  }

  return { defaults, presets, courses, count };
}

export function toRates(c: Counts): Rates {
  const rates = {} as Rates;
  for (const m of RATE_METRICS) {
    rates[m.key] = c[m.denominator] ? c[m.numerator] / c[m.denominator] : null;
  }
  return rates;
}

export type TeamResult = (typeof TEAMS)[number] & { counts: Counts; rates: Rates };

// 팀 비교에 필요한 기준값: 팀 평균 수치, 지역 유월율, 지표별 막대 눈금, 팀 순위
export function summarize(teams: TeamResult[], region: Counts) {
  const regionRates = toRates(region);
  const average = {} as Counts;
  const countScale = {} as Record<CountKey, number>;
  const rateScale = {} as Record<RateKey, number>;
  const countRank = {} as Record<CountKey, Map<number, number>>;
  const rateRank = {} as Record<RateKey, Map<number, number>>;

  // 큰 값부터 1위. 같은 값은 같은 순위
  const rank = (values: [number, number | null][]) => {
    const sorted = values.filter(([, v]) => v !== null).map(([, v]) => v!).sort((a, b) => b - a);
    return new Map(values.filter(([, v]) => v !== null).map(([id, v]) => [id, sorted.indexOf(v!) + 1]));
  };

  for (const m of COUNT_METRICS) {
    average[m.key] = teams.reduce((sum, t) => sum + t.counts[m.key], 0) / teams.length;
    countScale[m.key] = Math.max(...teams.map((t) => Math.abs(t.counts[m.key] - average[m.key])));
    countRank[m.key] = rank(teams.map((t) => [t.id, t.counts[m.key]]));
  }
  for (const m of RATE_METRICS) {
    const base = regionRates[m.key];
    rateScale[m.key] = Math.max(...teams.map((t) => (t.rates[m.key] === null || base === null ? 0 : Math.abs(t.rates[m.key]! - base))));
    rateRank[m.key] = rank(teams.map((t) => [t.id, t.rates[m.key]]));
  }
  return { regionRates, average, countScale, rateScale, countRank, rateRank };
}

export type Summary = ReturnType<typeof summarize>;
