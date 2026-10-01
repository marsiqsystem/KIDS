"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CalendarPlus, Radio, Video } from "lucide-react";
import { callOffClass, closeClass, hideClassRecording, newClass, openClass } from "@/app/admin/actions";
import type { Batch } from "@/lib/admin/batches";
import type { LiveClass } from "@/lib/admin/classes";
import { Alert, Field, RowAction, Submit, INPUT, SURFACE } from "./ui";

/**
 * The teacher's console.
 *
 * Three states a class can be in, and the screen never blurs them: scheduled (a
 * plan), open (students can be in it now), finished. The timetable is a promise
 * and `started_at` is the fact, so a class that begins twenty minutes late says
 * so rather than quietly rewriting when it was meant to start.
 *
 * `Open the room` is the only thing that admits a student. Until it is pressed
 * no student token is minted anywhere, so a class is not merely hidden — it is
 * shut.
 */
export default function ClassesPanel({
  classes,
  batches,
  configured,
}: {
  classes: LiveClass[];
  batches: Batch[];
  configured: boolean;
}) {
  // Bucketed by the database's clock, in the query that fetched these. Deciding
  // "has this started yet" from Date.now() in here would be both an impure call
  // during render and the wrong clock to ask.
  const open = classes.filter((c) => c.bucket === "open");
  const ahead = classes.filter((c) => c.bucket === "ahead");
  const past = classes.filter((c) => c.bucket === "past");

  return (
    <div className="space-y-6">
      {!configured ? (
        <p className="rounded border border-[#E8C9CC] bg-[#F6E9E9] p-4 text-sm text-[#B22234]">
          No live-class server is configured on this deployment, so a room cannot be opened yet.
          Classes can still be scheduled. The checklist for standing the server up is in{" "}
          <code>docs/live-class-server.md</code>.
        </p>
      ) : null}

      <Schedule batches={batches.filter((b) => !b.archived_at)} />

      <List title="Happening now" classes={open} empty="" configured={configured} />
      <List
        title="Scheduled"
        classes={ahead}
        empty="Nothing scheduled. Add a class above."
        configured={configured}
      />
      <List title="Finished" classes={past.slice(0, 20)} empty="" configured={configured} />
    </div>
  );
}

function Schedule({ batches }: { batches: Batch[] }) {
  const [state, action] = useActionState(newClass, {});

  if (batches.length === 0) {
    return (
      <section className={`rounded p-5 ${SURFACE}`}>
        <p className="text-sm text-[#6B5B5D]">
          There are no batches yet, and a class belongs to a batch. Make one under{" "}
          <Link href="/admin?tab=batches" className="text-[#137565] underline">
            Batches
          </Link>{" "}
          first.
        </p>
      </section>
    );
  }

  return (
    <section className={`rounded p-5 ${SURFACE}`}>
      <div className="mb-4 flex items-center gap-2">
        <CalendarPlus className="h-4 w-4 text-[#7B1E2B]" aria-hidden />
        <h2 className="text-sm font-bold">Schedule a class</h2>
      </div>

      <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Batch</span>
          <select name="batchId" className={INPUT} required>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.student_count})
              </option>
            ))}
          </select>
        </label>

        <div className="lg:col-span-2">
          <Field label="What is it" name="title" required placeholder="Algebra — quadratics" />
        </div>
        <Field label="Subject (optional)" name="subject" placeholder="Maths" />
        <Field label="Date" name="date" type="date" required />
        <Field label="Start time" name="time" type="time" required hint="Kolkata time." />
        <Field label="Minutes" name="minutes" type="number" defaultValue="90" />

        <div className="sm:col-span-2 lg:col-span-6">
          <Alert state={state} />
          <div className="mt-3">
            <Submit>Schedule it</Submit>
          </div>
        </div>
      </form>
    </section>
  );
}

function List({
  title,
  classes,
  empty,
  configured,
}: {
  title: string;
  classes: LiveClass[];
  empty: string;
  configured: boolean;
}) {
  if (classes.length === 0 && !empty) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6B5B5D]">{title}</h2>
      {classes.length === 0 ? (
        <p className="text-sm text-[#6B5B5D]">{empty}</p>
      ) : (
        <div className="space-y-3">
          {classes.map((c) => (
            <ClassRow key={c.id} c={c} configured={configured} />
          ))}
        </div>
      )}
    </section>
  );
}

function ClassRow({ c, configured }: { c: LiveClass; configured: boolean }) {
  const open = Boolean(c.started_at && !c.ended_at && !c.cancelled_at);
  const done = Boolean(c.ended_at);

  return (
    <div className={`rounded p-4 ${SURFACE}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {open ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B22234]">
            <Radio className="h-3 w-3" aria-hidden />
            LIVE
          </span>
        ) : null}
        <strong className="text-sm">{c.title}</strong>
        <span className="text-xs text-[#6B5B5D]">
          {c.batch_name}
          {c.subject ? ` · ${c.subject}` : ""} · {when(c.starts_at)} · {c.minutes} min
        </span>
      </div>

      <p className="mt-1 text-xs text-[#6B5B5D]">
        {c.cancelled_at
          ? "Cancelled."
          : done
            ? `Ended. ${c.attended} student${c.attended === 1 ? "" : "s"} joined.`
            : open
              ? `Started ${when(c.started_at!)} · ${c.attended} joined so far`
              : "Not started — nobody can join yet."}
      </p>

      {!c.cancelled_at && !done ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/*
            Two different things, and they were one until 11 Sep 2026.
            "Go to the room" is navigation — the class is already open, walk in.
            "Open the room" is an EVENT: it sets started_at, which is the only
            thing that lets a student's token be minted. A Link cannot do that,
            and while both were a Link the button sent the teacher to a page
            saying "go back to Classes and press Open the room" — the button
            they had just pressed. A class could not be opened from the console
            at all.
          */}
          {configured ? (
            open ? (
              <Link
                href={`/admin/class/${c.id}`}
                className="rounded bg-[#7B1E2B] px-3 py-1.5 text-xs font-semibold text-[#FDFBF7]"
              >
                Go to the room
              </Link>
            ) : (
              <RowAction action={openClass} fields={{ classId: c.id }} primary>
                Open the room
              </RowAction>
            )
          ) : null}
          {open ? (
            <RowAction
              action={closeClass}
              fields={{ classId: c.id }}
              confirm="End the class for everybody?"
            >
              End the class
            </RowAction>
          ) : (
            <RowAction
              action={callOffClass}
              fields={{ classId: c.id }}
              danger
              confirm="Cancel this class?"
            >
              Cancel
            </RowAction>
          )}
        </div>
      ) : null}

      {done ? <Recording c={c} /> : null}
    </div>
  );
}

/**
 * The class's recording, as the class server handed it over.
 *
 * Nothing to press: the teacher's room starts the recorder, and when the class
 * ends the server uploads the video to the KIDS Drive ("KIDS class recordings")
 * and it appears here and on the batch's phones. A long class can take a while
 * to arrive. The only control is to hide a part — for a lesson that went wrong,
 * or a child who should not have been on camera.
 */
function Recording({ c }: { c: LiveClass }) {
  const parts = c.recordings ?? [];

  if (parts.length === 0) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-[#6B5B5D]">
        <Video className="h-3 w-3" aria-hidden />
        No recording has arrived for this class.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-1.5">
      {parts.map((r, i) => (
        <li key={r.id} className={`flex flex-wrap items-center gap-3 text-xs ${r.hidden ? "opacity-60" : ""}`}>
          <a
            href={`https://drive.google.com/file/d/${r.drive_id}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-[#7B1E2B]"
          >
            <Video className="h-3.5 w-3.5" aria-hidden />
            Recording{parts.length > 1 ? `, part ${i + 1}` : ""}
          </a>
          <span className="text-[#6B5B5D]">{(r.bytes / 1024 / 1024 / 1024).toFixed(2)} GB</span>
          {r.hidden ? (
            <span className="text-[#B22234]">Hidden from students</span>
          ) : (
            <RowAction
              action={hideClassRecording}
              fields={{ classId: c.id, recordingId: r.id }}
              danger
              confirm="Hide this recording from the students? Its link stops working too."
            >
              Hide from students
            </RowAction>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Kolkata time, always — the server runs in UTC and the school does not. */
function when(at: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(at));
}
