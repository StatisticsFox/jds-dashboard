import Link from "next/link";

type Category = { label: string; color: string };
type Row = { key: string; label: string; href: object; active: boolean; counts: Map<string, number> };

// 100% 누적 가로 막대: 한 줄 = 한 주차, 조각 = 섭외유형 비율.
// 줄을 누르면 그 주차가 선택되고, 조각에 마우스를 올리면 개수·비율이 보임
export function StackedShare({ categories, rows, rowLabel = "주차" }: { categories: Category[]; rows: Row[]; rowLabel?: string }) {
  const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);

  return (
    <div className="space-y-4">
      {/* 범례 (막대와 같은 순서·색) */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {categories.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
            {c.label}
          </li>
        ))}
      </ul>

      <ul className="space-y-2">
        {rows.map((r) => {
          const total = [...r.counts.values()].reduce((a, b) => a + b, 0);
          return (
            <li key={r.key}>
              <Link
                href={r.href}
                scroll={false}
                aria-current={r.active}
                className={`grid grid-cols-[5rem_1fr_3.5rem] items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${
                  r.active ? "bg-accent-soft" : "hover:bg-accent-soft/50"
                }`}
              >
                <span className={`text-sm ${r.active ? "font-semibold" : "text-muted"}`}>{r.label}</span>
                <span className="flex h-7 gap-0.5 overflow-visible">
                  {categories.map((c, i) => {
                    const n = r.counts.get(c.label) ?? 0;
                    if (!n) return null;
                    const p = pct(n, total);
                    const first = i === categories.findIndex((x) => (r.counts.get(x.label) ?? 0) > 0);
                    const last = categories.slice(i + 1).every((x) => !(r.counts.get(x.label) ?? 0));
                    return (
                      <span
                        key={c.label}
                        className={`group relative flex items-center justify-center text-[11px] font-semibold text-[#0b1210] ${first ? "rounded-l-lg" : ""} ${last ? "rounded-r-lg" : ""}`}
                        style={{ width: `${p}%`, background: c.color }}
                      >
                        {/* 조각이 충분히 넓을 때만 비율 표시 (좁으면 툴팁으로) */}
                        {p >= 9 && <span>{Math.round(p)}%</span>}
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-normal text-foreground shadow-lg group-hover:block">
                          {r.label} · {c.label} <b className="ml-1">{n.toLocaleString()}명</b> ({p.toFixed(1)}%)
                        </span>
                      </span>
                    );
                  })}
                </span>
                <span className="text-right text-xs tabular-nums text-muted">{total.toLocaleString()}명</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* 표로 보기: 행 = 주차, 열 = 섭외유형 (인원과 비율) */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">표로 보기</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-0 tabular-nums">
            <thead>
              <tr className="text-xs text-muted">
                <th className="border-b border-border py-2 pr-4 text-left font-medium">{rowLabel}</th>
                {categories.map((c) => (
                  <th key={c.label} className="border-b border-border px-3 py-2 text-right font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="border-b border-border px-3 py-2 text-right font-medium">합계</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const total = [...r.counts.values()].reduce((a, b) => a + b, 0);
                return (
                  <tr key={r.key}>
                    <th className="border-b border-grid py-2 pr-4 text-left font-medium">{r.label}</th>
                    {categories.map((c) => {
                      const n = r.counts.get(c.label) ?? 0;
                      return (
                        <td key={c.label} className="border-b border-grid px-3 py-2 text-right">
                          {n.toLocaleString()} <span className="text-xs text-muted">({pct(n, total).toFixed(1)}%)</span>
                        </td>
                      );
                    })}
                    <td className="border-b border-grid px-3 py-2 text-right font-semibold">{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
