// 다른 탭으로 넘어갈 때 서버가 화면을 만드는 동안 보여주는 뼈대 (사이드바는 그대로)
export default function Loading() {
  const block = "animate-pulse rounded-md bg-grid";
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8" aria-busy aria-label="불러오는 중">
      <div className="space-y-2 border-b border-border pb-5">
        <div className={`${block} h-7 w-48`} />
        <div className={`${block} h-4 w-80 max-w-full`} />
      </div>
      <div className="card space-y-3 p-5">
        <div className={`${block} h-7 w-full max-w-xl`} />
        <div className={`${block} h-7 w-full max-w-md`} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-2 p-4">
            <div className={`${block} h-3 w-20`} />
            <div className={`${block} h-8 w-24`} />
          </div>
        ))}
      </div>
      <div className="card p-5">
        <div className={`${block} h-64 w-full`} />
      </div>
    </main>
  );
}
