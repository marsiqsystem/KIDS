import Link from "next/link";
import { PlayCircle, VideoOff } from "lucide-react";
import { requireStudent } from "@/lib/app/gate";
import { recordingsForStudent } from "@/lib/admin/recordings";
import { Empty, Head } from "@/components/app/kit";
import "../class/class.css";

/**
 * Every recorded class this student may watch again.
 *
 * The batch as it is now decides, like posts: a child who joins in week six
 * finds weeks one to five here. One row per class however many parts the
 * recorder left; the class page plays the parts in order.
 */
export const dynamic = "force-dynamic";

export default async function RecordingsPage() {
  const student = await requireStudent();
  const all = await recordingsForStudent(student.uid);

  const classes = new Map<string, (typeof all)[number]>();
  for (const r of all) if (!classes.has(r.class_id)) classes.set(r.class_id, r);
  const list = [...classes.values()];

  return (
    <>
      <Head title="Recordings" back="/app/learn" aside={list.length > 0 ? `${list.length}` : undefined} />

      {list.length === 0 ? (
        <div className="k-card k-card--dashed">
          <Empty
            title="No recordings yet"
            line="Every live class is recorded. It appears here after the class ends."
            icon={<VideoOff size={30} />}
          />
        </div>
      ) : (
        <ul className="rec-list">
          {list.map((r) => (
            <li key={r.class_id}>
              <Link href={`/app/class/${r.class_id}`} className="rec-item">
                <span className="rec-item__icon" aria-hidden="true">
                  <PlayCircle size={22} />
                </span>
                <span className="rec-item__body">
                  <p className="rec-item__title">{r.title}</p>
                  <p className="rec-item__meta">
                    {r.subject ? `${r.subject} · ` : ""}
                    {new Date(r.starts_at).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    {` · ${r.minutes} min`}
                  </p>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
