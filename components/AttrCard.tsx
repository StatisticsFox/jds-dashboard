import Link from "next/link";
import { DonutChart, type Slice } from "@/components/DonutChart";

type Row = { label: string; count: number };

// 항목 하나의 값별 인원 막대 (한 가지 색). 비율은 항상 '등록 인원 중 %'
export function AttrCard({ title, total, rows, note }: { title: string; total: number; rows: Row[]; note?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="card flex flex-col p-5">
      <h3 className="text-base">
        {title}
      </h3>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      <ul className="mt-3 space-y-1.5 text-sm tabular-nums">
        {rows.map((r) => {
          const pct = total ? (r.count / total) * 100 : 0;
          return (
            <li key={r.label} className="group">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 text-xs">
                  <span className="text-muted">{r.count}명</span> <b className="ml-1">{pct.toFixed(0)}%</b>
                </span>
              </div>
              <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-grid">
                <div className="h-full rounded-full bg-series-1 transition-opacity group-hover:opacity-80" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// 원그래프 카드 (섭외유형·성별처럼 종류가 적은 항목)
export function DonutCard({ title, slices }: { title: string; slices: Slice[] }) {
  return (
    <section className="card flex flex-col p-5">
      <h3 className="mb-3 text-base">
        {title}
      </h3>
      <DonutChart slices={slices} size={170} compact />
    </section>
  );
}

// MBTI: 네 축(E/I, S/N, T/F, J/P) 좌우 막대 + 많은 유형
export function MbtiCard({ axes, top, total }: { axes: { a: string; b: string; na: number; nb: number }[]; top: Row[]; total: number }) {
  return (
    <section className="card flex flex-col p-5">
      <h3 className="text-base">
        MBTI
      </h3>
      <ul className="mt-3 space-y-2.5 text-xs tabular-nums">
        {axes.map(({ a, b, na, nb }) => {
          const sum = na + nb || 1;
          return (
            <li key={a} className="grid grid-cols-[3.25rem_1fr_3.25rem] items-center gap-2">
              <span>
                <b className="text-sm">{a}</b> {Math.round((na / sum) * 100)}%
              </span>
              <span className="flex h-3 gap-0.5 overflow-hidden rounded-full" title={`${a} ${na}명 · ${b} ${nb}명`}>
                <span className="rounded-l-full" style={{ width: `${(na / sum) * 100}%`, background: "var(--cat-1)" }} />
                <span className="rounded-r-full" style={{ width: `${(nb / sum) * 100}%`, background: "var(--cat-2)" }} />
              </span>
              <span className="text-right">
                {Math.round((nb / sum) * 100)}% <b className="text-sm">{b}</b>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t border-grid pt-3">
        <p className="mb-1.5 text-xs text-muted">많은 유형</p>
        <ol className="flex flex-wrap gap-1.5 text-xs">
          {top.map((t) => (
            <li key={t.label} className="rounded-full bg-accent-soft px-2.5 py-1">
              <b className="font-mono">{t.label}</b> <span className="text-muted">{t.count}명 · {total ? Math.round((t.count / total) * 100) : 0}%</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// 개강별 비교 표: 행 = 개강, 열 = 값, 칸 = 그 개강 등록 인원 중 %, 진할수록 높음
export function CompareTable({
  values,
  rows,
}: {
  values: string[];
  rows: { key: string; label: string; href: object; active: boolean; total: number; counts: Map<string, number> }[];
}) {
  const pct = (r: (typeof rows)[number], v: string) => (r.total ? (r.counts.get(v) ?? 0) / r.total : 0);
  const max = Math.max(0.0001, ...rows.flatMap((r) => values.map((v) => pct(r, v))));
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-max border-separate border-spacing-0.5 text-xs tabular-nums">
        <thead>
          <tr className="text-muted">
            <th className="sticky left-0 z-10 bg-surface px-2 py-2 text-left font-medium">개강</th>
            <th className="px-2 py-2 text-right font-medium">인원</th>
            {values.map((v) => (
              <th key={v} className="min-w-12 max-w-24 break-keep px-1.5 py-2 text-center align-bottom font-medium leading-tight" title={v}>
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.active ? "outline-2 -outline-offset-1 outline-accent" : ""}>
              <th className={`sticky left-0 z-10 whitespace-nowrap bg-surface px-2 py-1.5 text-left ${r.key.startsWith("y") || r.key === "all" ? "border-t border-border" : ""}`}>
                <Link href={r.href} scroll={false} className={`rounded-md px-1 hover:underline ${r.active ? "font-semibold text-accent-strong" : "font-medium"}`}>
                  {r.label}
                </Link>
              </th>
              <td className="px-2 py-1.5 text-right text-muted">{r.total}명</td>
              {values.map((v) => {
                const s = pct(r, v);
                const n = r.counts.get(v) ?? 0;
                return (
                  <td
                    key={v}
                    className="rounded-md px-1.5 py-1.5 text-center"
                    style={{ background: n ? `color-mix(in oklab, var(--series-1) ${Math.round(8 + (s / max) * 62)}%, var(--surface))` : undefined }}
                    title={`${r.label} · ${v}: ${n}명 (${(s * 100).toFixed(1)}%)`}
                  >
                    {n ? <span className={s / max > 0.45 ? "font-semibold text-accent-ink" : ""}>{Math.round(s * 100)}%</span> : <span className="text-muted/40">·</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
