import { DiffLabel, DivergingBar } from "@/components/DivergingBar";

type Row = { id: number; label: string; value: string; diff: number | null; diffText: string };

// 전체 탭: 한 지표를 7개 팀이 나란히 비교하는 작은 차트
export function MetricCompare({ title, baseLabel, rows, scale }: { title: string; baseLabel: string; rows: Row[]; scale: number }) {
  return (
    <figure className="tile p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-cute text-base">{title}</span>
        <span className="text-xs text-muted">{baseLabel}</span>
      </figcaption>
      <ul className="space-y-1.5 text-xs tabular-nums">
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[3.5rem_3.5rem_minmax(4rem,1fr)_4.5rem] items-center gap-2">
            <span className="whitespace-nowrap text-muted">{r.label}</span>
            <span className="text-right font-semibold">{r.value}</span>
            <DivergingBar diff={r.diff} scale={scale} />
            <span className="text-right">
              <DiffLabel diff={r.diff} text={r.diffText} />
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
