"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CalendarPlus, Radio, Video } from "lucide-react";
import { callOffClass, closeClass, newClass, saveRecording } from "@/app/admin/actions";
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
        <p className="rounded border border-[#6b3f3f] bg-[#241c1a] p-4 text-sm text-[#d98b8b]">
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
        <p className="text-sm text-[#9c8c86]">
          There are no batches yet, and a class belongs to a batch. Make one under{" "}
          <Link href="/admin?tab=batches" className="text-[#8fbfae] underline">
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
        <CalendarPlus className="h-4 w-4 text-[#8a6f66]" aria-hidden />
        <h2 className="text-sm font-bold">Schedule a class</h2>
      </div>

      <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">Batch</span>
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
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6b5c57]">{title}</h2>
      {classes.length === 0 ? (
        <p className="text-sm text-[#6b5c57]">{empty}</p>
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
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e0736c]">
            <Radio className="h-3 w-3" aria-hidden />
            LIVE
          </span>
        ) : null}
        <strong className="text-sm">{c.title}</strong>
        <span className="text-xs text-[#6b5c57]">
          {c.batch_name}
          {c.subject ? ` · ${c.subject}` : ""} · {when(c.starts_at)} · {c.minutes} min
        </span>
      </div>

      <p className="mt-1 text-xs text-[#6b5c57]">
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
          {configured ? (
            <Link
              href={`/admin/class/${c.id}`}
              className="rounded bg-[#8a6f66] px-3 py-1.5 text-xs font-semibold text-[#141010]"
            >
              {open ? "Go to the room" : "Open the room"}
            </Link>
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
 * The recording is a link the teacher pastes, not a file we made.
 *
 * Jibri, Jitsi's own recorder, needs roughly its own machine and would multiply
 * the cost of a three-month programme. The teacher records locally and posts it
 * unlisted to YouTube — free, unlimited, and the app already knows how to play
 * a YouTube link because the Learn tab does it.
 */
function Recording({ c }: { c: LiveClass }) {
  const [state, action] = useActionState(saveRecording, {});

  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="classId" value={c.id} />
      <label className="block grow">
        <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">
          <Video className="mr-1 inline h-3 w-3" aria-hidden />
          Recording link
        </span>
        <input
          className={INPUT}
          name="url"
          defaultValue={c.recording_url ?? ""}
          placeholder="https://youtu.be/… (unlisted)"
        />
      </label>
      <Submit>Save</Submit>
      <div className="w-full">
        <Alert state={state} />
      </div>
    </form>
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
