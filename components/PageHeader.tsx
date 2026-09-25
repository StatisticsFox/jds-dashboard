// 모든 탭 공통 머리: 제목 + 한 줄 설명 + (오른쪽) 기준 시각·새로고침 등
export function PageHeader({ title, description, meta, right }: { title: string; description?: React.ReactNode; meta?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-5">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap gap-1.5 text-xs">{meta}</div>}
      </div>
      {right}
    </header>
  );
}
