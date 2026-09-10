"use client";

import { useActionState } from "react";
import { Megaphone } from "lucide-react";
import { takePostDown, writePost } from "@/app/admin/actions";
import type { Batch } from "@/lib/admin/batches";
import type { Post } from "@/lib/admin/posts";
import { Alert, Field, RowAction, Submit, INPUT, SURFACE } from "./ui";

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
          <p className={`rounded p-4 text-sm text-[#9c8c86] ${SURFACE}`}>
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
          <h2 className="mb-2 text-sm font-bold text-[#9c8c86]">Taken down</h2>
          <ul className="space-y-3">
            {down.slice(0, 10).map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-[#6b5c57]">
        A post is not sent anywhere — no SMS, no email. It appears under the bell the next time the
        student opens the app, and it stays there for 90 days. Students cannot reply to it.
      </p>
    </div>
  );
}

function Write({ batches, canPostToAll }: { batches: Batch[]; canPostToAll: boolean }) {
  const [state, action] = useActionState(writePost, {});

  if (!canPostToAll && batches.length === 0) {
    return (
      <section className={`rounded p-5 ${SURFACE}`}>
        <p className="text-sm text-[#9c8c86]">
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

      <form action={action} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">Who sees it</span>
          <select name="batchId" className={INPUT} defaultValue={canPostToAll ? "" : batches[0]!.id}>
            {canPostToAll ? (
              <option value="">Everybody with an app account</option>
            ) : null}
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.student_count} student{b.student_count === 1 ? "" : "s"}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-[#6b5c57]">
            A batch post follows the batch, not a list of names: a child added tomorrow sees it,
            and a child taken out stops seeing it.
          </span>
        </label>

        <Field
          label="Heading"
          name="title"
          required
          placeholder="No class on Thursday"
          hint="This is the line they read under the bell. Keep it a sentence."
        />

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">What it says</span>
          <textarea
            name="body"
            required
            rows={4}
            maxLength={1200}
            placeholder="Thursday 17 September is a holiday. The Physical Science class moves to Friday, same time."
            className={INPUT}
          />
          <span className="mt-1 block text-xs text-[#6b5c57]">
            Plain words. Never a mark, a rank, or another child&rsquo;s name.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <Submit>Post it</Submit>
          <Alert state={state} />
        </div>
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
        <span className="text-xs text-[#6b5c57]">
          {post.audience === "all" ? "Everybody" : (post.batch_name ?? "A batch")} · {when} ·{" "}
          {post.posted_by_name ?? post.posted_by}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm text-[#c9b8b2]">{post.body}</p>

      {post.retracted_at ? (
        <p className="mt-3 text-xs text-[#d98b8b]">
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
