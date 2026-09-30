import { PageHeader } from "@/components/PageHeader";
import { PendingLink } from "@/components/Pending";
import { koreanDate } from "@/lib/access-log";
import { requireUser } from "@/lib/dal";
import { NOTICES, type Notice } from "@/lib/notices";

// 이 기간(일) 안에 올라온 공지에는 NEW 표시
const NEW_DAYS = 14;

const TAG_STYLE: Record<Notice["tag"], string> = {
  업데이트: "border-accent/40 bg-accent-soft text-accent-strong",
  수정: "border-border bg-background text-foreground",
  안내: "border-border bg-background text-muted",
};

// "2026-10-01" → "2026. 10. 1."
const formatDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}. ${m}. ${day}.`;
};

export default async function NoticesPage() {
  await requireUser();

  const newSince = koreanDate(NEW_DAYS);
  const [latest, ...older] = NOTICES;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <PageHeader title="공지사항" description="대시보드에 새로 생긴 기능과 바뀐 점을 알려 드려요" />

      {latest && <NoticeCard notice={latest} isNew={latest.date >= newSince} open />}

      {older.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 text-sm font-semibold text-muted">지난 공지</h2>
          {older.map((n) => (
            <NoticeCard key={n.id} notice={n} isNew={n.date >= newSince} />
          ))}
        </section>
      )}
    </main>
  );
}

// 공지 하나. 가장 최근 공지는 펼친 채로, 지난 공지는 눌러서 펼침
function NoticeCard({ notice, isNew, open = false }: { notice: Notice; isNew: boolean; open?: boolean }) {
  return (
    <details open={open} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none flex-col gap-2 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-md border px-2 py-0.5 font-semibold ${TAG_STYLE[notice.tag]}`}>{notice.tag}</span>
          {isNew && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">NEW</span>}
          <time dateTime={notice.date} className="text-muted">
            {formatDate(notice.date)}
          </time>
          <span className="ml-auto text-muted transition-transform group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </div>
        <h2 className="text-lg leading-snug sm:text-xl">{notice.title}</h2>
        <p className="text-sm text-muted">{notice.summary}</p>
      </summary>

      <ol className="space-y-6 border-t border-border px-5 py-5 sm:px-6">
        {notice.items.map((item, i) => (
          <li key={item.title} className="grid grid-cols-[1.75rem_1fr] gap-x-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-xs font-semibold text-accent-strong">{i + 1}</span>
            <div className="min-w-0 space-y-2">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="text-sm leading-relaxed">{item.body}</p>
              {item.points && (
                <ul className="space-y-1 text-sm text-muted">
                  {item.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden className="text-accent">
                        ·
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              {item.links && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.links.map((l) => (
                    <PendingLink
                      key={l.href}
                      href={l.href}
                      className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent-strong"
                    >
                      {l.label} 바로가기 →
                    </PendingLink>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
