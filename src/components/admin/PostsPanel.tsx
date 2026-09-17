"use client";

import { useActionState, useState } from "react";
import { Megaphone } from "lucide-react";
import { takePostDown, writePost } from "@/app/admin/actions";
import type { Batch } from "@/lib/admin/batches";
import type { Post } from "@/lib/admin/posts";
import { Alert, RowAction, Submit, INPUT, SURFACE } from "./ui";

/**
 * Posts — the office's own voice in the app.
 *
 * Everything else a student sees in Notices is worked out from their record.
 * This is the one screen where somebody types words that will appear on 65
 * phones, so it says out loud who is about to receive them, and it offers no
 * Edit button: a post is retracted and rewritten, because a student who has
 * read one has read the words that were on the screen.
 */
export default function PostsPanel({
  posts,
  batches,
  canPostToAll,
}: {
  posts: Post[];
  batches: Batch[];
  canPostToAll: boolean;
}) {
  const live = posts.filter((p) => !p.retracted_at);
  const down = posts.filter((p) => p.retracted_at);

  return (
    <div className="space-y-6">
      <Write batches={batches.filter((b) => !b.archived_at)} canPostToAll={canPostToAll} />

      <section>
        <h2 className="mb-2 text-sm font-bold">On the students&rsquo; screens</h2>
        {live.length === 0 ? (
          <p className={`rounded p-4 text-sm text-[#6B5B5D] ${SURFACE}`}>
            Nothing posted. Most weeks there is nothing to post, and that is the right number — a
            notice list with something new in it every day is one nobody reads.
          </p>
        ) : (
          <ul className="space-y-3">
            {live.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </ul>
        )}
      </section>

      {down.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-[#6B5B5D]">Taken down</h2>
          <ul className="space-y-3">
            {down.slice(0, 10).map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-[#6B5B5D]">
        A post is not sent anywhere — no SMS, no email. It appears under the bell the next time the
        student opens the app, and it stays there for 90 days. Students cannot reply to it.
      </p>
    </div>
  );
}

/**
 * What the child will see, while it is still being typed. Redesign board 10.
 *
 * A copy of the app's notice card rather than the card itself: that one is a
 * server component inside the student's shell, and dragging it in here would
 * couple the office tool to the student app's session. The risk of a copy is
 * that the two drift, so this holds only the three things the office is
 * actually deciding — the icon and tone for a post, the heading, and the words
 * — and leaves the read dot, the mark-read control and the 90-day expiry to the
 * real screen.
 *
 * It exists because the heading is the whole message for most students. It is
 * the line under the bell, and it is easy to write one that makes sense only to
 * the person who already knows what it is about.
 */
function Preview({ title, body, who }: { title: string; body: string; who: string }) {
  return (
    <div className="rounded-[14px] border border-[#F2E9DA] bg-[#FBF7EF] p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5B5D]">
        Under the bell
      </div>
      <p className="mt-1 text-xs text-[#6B5B5D]">{who}</p>

      <div className="mx-auto mt-3 w-full max-w-[330px] rounded-[18px] border border-[#E3D6C4] bg-white p-3">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E6F5F2] text-[#137565]">
            <Megaphone size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-snug text-[#2B1A1C]">
              {title || <span className="text-[#A79B9C]">Your heading</span>}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#4A3A3C]">
              {body || <span className="text-[#A79B9C]">The words you type appear here.</span>}
            </p>
            <p className="mt-2 text-[12px] text-[#6B5B5D]">From KIDS · just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Write({ batches, canPostToAll }: { batches: Batch[]; canPostToAll: boolean }) {
  const [state, action] = useActionState(writePost, {});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [batchId, setBatchId] = useState(canPostToAll ? "" : (batches[0]?.id ?? ""));

  const chosen = batches.find((b) => b.id === batchId);
  const who = chosen
    ? `${chosen.name} · ${chosen.student_count} student${chosen.student_count === 1 ? "" : "s"}`
    : "Everybody with an app account";

  if (!canPostToAll && batches.length === 0) {
    return (
      <section className={`rounded p-5 ${SURFACE}`}>
        <p className="text-sm text-[#6B5B5D]">
          You do not take a batch yet, so there is nobody to post to.
        </p>
      </section>
    );
  }

  return (
    <section className={`rounded p-5 ${SURFACE}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Megaphone className="h-4 w-4" aria-hidden />
        Write a post
      </h2>

      <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Who sees it</span>
          <select
            name="batchId"
            className={INPUT}
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          >
            {canPostToAll ? (
              <option value="">Everybody with an app account</option>
            ) : null}
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.student_count} student{b.student_count === 1 ? "" : "s"}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-[#6B5B5D]">
            A batch post follows the batch, not a list of names: a child added tomorrow sees it,
            and a child taken out stops seeing it.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Heading</span>
          <input
            name="title"
            required
            placeholder="No class on Thursday"
            className={INPUT}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <span className="mt-1 block text-xs text-[#6B5B5D]">
            This is the line they read under the bell. Keep it a sentence.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">What it says</span>
          <textarea
            name="body"
            required
            rows={4}
            maxLength={1200}
            placeholder="Thursday 17 September is a holiday. The Physical Science class moves to Friday, same time."
            className={INPUT}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <span className="mt-1 block text-xs text-[#6B5B5D]">
            Plain words. Never a mark, a rank, or another child&rsquo;s name.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <Submit>Post it</Submit>
          <Alert state={state} />
        </div>
        </div>

        <Preview title={title} body={body} who={who} />
      </form>
    </section>
  );
}

function PostCard({ post }: { post: Post }) {
  const when = new Date(post.posted_at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <li className={`rounded p-4 ${SURFACE} ${post.retracted_at ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-bold">{post.title}</h3>
        <span className="text-xs text-[#6B5B5D]">
          {post.audience === "all" ? "Everybody" : (post.batch_name ?? "A batch")} · {when} ·{" "}
          {post.posted_by_name ?? post.posted_by}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm text-[#4A3A3C]">{post.body}</p>

      {post.retracted_at ? (
        <p className="mt-3 text-xs text-[#B22234]">
          Taken down. It is off every screen, including the students who had already read it.
        </p>
      ) : (
        <div className="mt-3">
          <RowAction
            action={takePostDown}
            fields={{ postId: post.id }}
            danger
            confirm={`Take “${post.title}” off every student's screen?`}
          >
            Take it down
          </RowAction>
        </div>
      )}
    </li>
  );
}
