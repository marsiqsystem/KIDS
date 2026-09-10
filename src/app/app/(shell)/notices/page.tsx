import Link from "next/link";
import { requireStudent } from "@/lib/app/gate";
import { noticesFor } from "@/lib/app/notices";
import { markReadAction } from "@/app/app/notice-actions";
import "../../notices.css";

/**
 * Notices from KIDS — design 7b.
 *
 * Five things will ever appear here: results published, a paper opening soon, a
 * paper open now, today's set waiting, and a post from KIDS. Never another
 * student's marks, never a rank, and never a message for missing a day.
 *
 * A read notice loses its dot and its tint but is NOT hidden. A student who
 * half-remembers being told something must be able to find it a week later, and
 * on a shared handset that is often the only record of what was said.
 *
 * Reading is not automatic on open. The list is where a student decides what
 * they have dealt with; opening the screen to check is not the same act, and a
 * results notice that cleared itself the first time a child glanced at the bell
 * would be gone before they had read it.
 */
export const dynamic = "force-dynamic";

function Bell() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export default async function NoticesPage() {
  const student = await requireStudent();
  const notices = await noticesFor(student);
  const unread = notices.filter((n) => !n.read);

  return (
    <>
      <div className="not-head">
        <div>
          <h1 className="app-h1">From KIDS</h1>
          <p className="app-sub">
            {unread.length > 0
              ? `${unread.length} you have not read`
              : "Nothing waiting to be read"}
          </p>
        </div>
        {unread.length > 0 && (
          <form action={markReadAction}>
            {unread.map((n) => (
              <input key={n.key} type="hidden" name="key" value={n.key} />
            ))}
            <button type="submit" className="not-clear">
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="app-soon">
          <Bell />
          <h2>Nothing from KIDS just now</h2>
          <p>
            Results, exam papers and anything KIDS wants to tell your class are announced here.
            Most weeks there is nothing, and that is normal — your daily set does not need a
            notice to be waiting for you.
          </p>
        </div>
      ) : (
        <ul className="not-list">
          {notices.map((n) => (
            <li key={n.key} className={`not-item${n.read ? " not-item--read" : ""}`}>
              <div className="not-item__head">
                <h2 className="not-item__title">
                  {!n.read && <span className="not-dot" aria-label="Unread" />}
                  {n.title}
                </h2>
                <span className="not-item__when">{n.when}</span>
              </div>
              <p className="not-item__body">{n.body}</p>
              <div className="not-item__acts">
                {n.action && (
                  <Link href={n.action.href} className="app-btn app-btn--outline app-btn--small">
                    {n.action.label}
                  </Link>
                )}
                {!n.read && (
                  <form action={markReadAction}>
                    <input type="hidden" name="key" value={n.key} />
                    <button type="submit" className="not-clear">
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="not-foot">
        Only five things ever appear here: your results, a paper opening, a paper open now, your
        daily set, and a post from KIDS or your teacher. KIDS does not send SMS — messages cost money the institute would rather spend on
        the exam.
      </p>
    </>
  );
}
