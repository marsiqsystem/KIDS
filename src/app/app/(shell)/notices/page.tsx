import Link from "next/link";
import { Award, BellOff, CalendarClock, FilePenLine, Megaphone, Sparkle } from "lucide-react";
import type { ReactNode } from "react";
import { requireStudent } from "@/lib/app/gate";
import { noticesFor, type NoticeKind } from "@/lib/app/notices";
import { markReadAction } from "@/app/app/notice-actions";
import { Empty, Head } from "@/components/app/kit";
import "../../notices.css";

/**
 * Notices from KIDS. Redesign board 07, 3C.
 *
 * Only five kinds ever exist, each with its own icon and colour: results
 * published, a paper opening soon, a paper open now, today's set waiting, and a
 * post from KIDS. Never another student's marks, never a rank, never a message
 * for missing a day.
 *
 * Unread is a gold dot and a border. A read notice drops to the cream surface
 * but is NOT hidden, and opening this screen does not mark anything read —
 * the student marks each one.
 *
 * Not drawn from the board: its "Your spelling was corrected" and "Version 1.4
 * is out" rows. Neither is one of the five kinds.
 */
export const dynamic = "force-dynamic";

const KIND: Record<NoticeKind, { icon: ReactNode; tone: string; from: string }> = {
  results: { icon: <Award size={20} />, tone: "gold", from: "From the KIDS office" },
  "paper-soon": { icon: <CalendarClock size={20} />, tone: "maroon", from: "From the KIDS office" },
  "paper-open": { icon: <FilePenLine size={20} />, tone: "maroon", from: "From the KIDS office" },
  daily: { icon: <Sparkle size={20} />, tone: "blue", from: "Your daily set" },
  post: { icon: <Megaphone size={20} />, tone: "teal", from: "From KIDS" },
};

export default async function NoticesPage() {
  const student = await requireStudent();
  const notices = await noticesFor(student);
  const unread = notices.filter((n) => !n.read);

  return (
    <>
      <Head
        title="Notices"
        back="/app"
        aside={
          unread.length > 0 ? (
            <form action={markReadAction}>
              {unread.map((n) => (
                <input key={n.key} type="hidden" name="key" value={n.key} />
              ))}
              <button type="submit" className="nt-all">
                Mark all read
              </button>
            </form>
          ) : undefined
        }
      />

      {notices.length === 0 ? (
        <div className="k-card k-card--dashed">
          <Empty title="Nothing from KIDS" line="Results and papers show here." icon={<BellOff size={30} />} />
        </div>
      ) : (
        <ul className="nt-list">
          {notices.map((n) => {
            const kind = KIND[n.kind];
            return (
              <li key={n.key} className={`nt${n.read ? " nt--read" : ""}`}>
                <span className={`nt__icon nt__icon--${kind.tone}`} aria-hidden="true">
                  {kind.icon}
                </span>
                <div className="nt__body">
                  <h2 className="nt__title">
                    {!n.read ? <span className="nt__dot" aria-label="Unread" /> : null}
                    {n.title}
                  </h2>
                  <p className="nt__text">{n.body}</p>
                  <p className="nt__from">
                    {kind.from} · {n.when}
                  </p>
                  {n.action || !n.read ? (
                    <div className="nt__acts">
                      {n.action ? (
                        <Link href={n.action.href} className="k-btn k-btn--small">
                          {n.action.label}
                        </Link>
                      ) : null}
                      {!n.read ? (
                        <form action={markReadAction}>
                          <input type="hidden" name="key" value={n.key} />
                          <button type="submit" className="k-btn k-btn--small k-btn--quiet">
                            Mark read
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
