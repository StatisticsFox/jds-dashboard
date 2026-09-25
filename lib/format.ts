// 개수: 육따기는 0.5 단위라 소수가 있으면 한 자리까지
export const formatCount = (v: number) => (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1));

// 비율: 0.3684 → "36.8%", 계산할 수 없으면 "–"
export const formatRate = (v: number | null) => (v === null ? "–" : `${(v * 100).toFixed(1)}%`);

// 차이: 부호를 붙여서. 비율 차이는 %p
export const formatCountDiff = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${formatCount(Math.abs(Math.round(v * 10) / 10))}`;
export const formatRateDiff = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v * 100).toFixed(1)}%p`;
