// 가운데 기준선(평균)에서 좌우로 뻗는 막대. 높으면 오른쪽 초록, 낮으면 왼쪽 빨강
// scale: 막대가 절반 폭을 가득 채우는 차이값. 같은 지표끼리는 같은 scale을 써야 길이를 비교할 수 있음
export function DivergingBar({ diff, scale }: { diff: number | null; scale: number }) {
  const width = diff && scale ? Math.min(1, Math.abs(diff) / scale) * 50 : 0;
  return (
    <div className="relative h-5 min-w-24">
      <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-border" />
      {width > 0 && (
        <div
          className={`absolute inset-y-1 ${diff! > 0 ? "left-1/2 rounded-r-full bg-good" : "right-1/2 rounded-l-full bg-bad"}`}
          style={{ width: `max(${width}%, 2px)` }}
        />
      )}
    </div>
  );
}

// 차이 글자. 색만으로 구분하지 않도록 ▲▼ 기호를 같이 붙임
export function DiffLabel({ diff, text }: { diff: number | null; text: string }) {
  if (diff === null) return <span className="text-muted">–</span>;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "";
  return (
    <span className="whitespace-nowrap font-semibold">
      <span className={diff > 0 ? "text-good" : "text-bad"}>{arrow}</span> {text}
    </span>
  );
}
