"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setChapterVideo } from "@/app/admin/actions";
import type { ContentChapter } from "@/lib/admin/content";
import { Alert, INPUT, SURFACE } from "./ui";

const OPTIONS: [string, string][] = [
  ["IX", "Class IX"], ["X", "Class X"],
  ["XI|Science", "XI · Science"], ["XI|Commerce", "XI · Commerce"], ["XI|Arts", "XI · Arts"],
  ["XII|Science", "XII · Science"], ["XII|Commerce", "XII · Commerce"], ["XII|Arts", "XII · Arts"],
];

/**
 * Content — the videos on each chapter, and the office's voice in the app.
 *
 * Videos can be changed here because they are YouTube links, not files. The
 * questions, explanations and chapter tricks are reviewed files in the repo and
 * are deliberately not editable from a web page: a typo in an answer key typed
 * into a form reaches nine thousand children, and those go through review.
 *
 * Notices are the Posts tab, which already existed; this links to it rather
 * than drawing a second place to write one.
 */
export default function ContentPanel({
  choice,
  chapters,
}: {
  choice: string;
  chapters: ContentChapter[];
}) {
  const bySection = new Map<string, ContentChapter[]>();
  for (const c of chapters) bySection.set(c.section, [...(bySection.get(c.section) ?? []), c]);
  const withVideo = chapters.filter((c) => c.videoId).length;
  const changed = chapters.filter((c) => c.source === "changed" || c.source === "removed").length;

  return (
    <div className="space-y-6">
      <section className={`grid gap-4 rounded p-5 sm:grid-cols-2 ${SURFACE}`}>
        <div>
          <h2 className="text-sm font-bold">Notices</h2>
          <p className="mt-1 text-xs text-[#6b5c57]">
            Words from the office on every student&rsquo;s phone, or on one batch&rsquo;s.
          </p>
          <Link href="/admin?tab=posts" className="mt-2 inline-block text-xs text-[#c9b8b2] underline-offset-2 hover:underline">
            Write a notice in Posts →
          </Link>
        </div>
        <div>
          <h2 className="text-sm font-bold">Videos</h2>
          <p className="mt-1 text-xs text-[#6b5c57]">
            Paste a YouTube link to change a chapter&rsquo;s video. Students see the change within
            about a minute. Questions and explanations are reviewed files and are not edited here.
          </p>
        </div>
      </section>

      <form className="flex flex-wrap items-end gap-3" action="/admin" method="get">
        <input type="hidden" name="tab" value="content" />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">Class</span>
          <select name="cls" defaultValue={choice} className={INPUT}>
            {OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded border border-[#3a2f2c] px-3 py-2 text-sm text-[#c9b8b2] hover:bg-[#241c1a]">
          Show chapters
        </button>
        <span className="pb-2 text-xs text-[#6b5c57]">
          {chapters.length} chapters · {withVideo} with a video{changed ? ` · ${changed} changed by the office` : ""}
        </span>
      </form>

      {[...bySection.entries()].map(([section, rows]) => (
        <section key={section} className={`rounded ${SURFACE}`}>
          <h3 className="border-b border-[#2a2321] px-5 py-3 text-sm font-bold">{section}</h3>
          <ul className="divide-y divide-[#2a2321]">
            {rows.map((c) => (
              <ChapterRow key={`${c.bucket}|${c.chapter}`} c={c} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ChapterRow({ c }: { c: ContentChapter }) {
  const [state, action, pending] = useActionState(setChapterVideo, {});

  const badge =
    c.source === "changed" ? ["Changed by the office", "text-[#9fb0d9]"]
    : c.source === "removed" ? ["Removed by the office", "text-[#d98b8b]"]
    : c.source === "file" ? ["Reviewed video", "text-[#6b5c57]"]
    : ["No video", "text-[#d9b877]"];

  return (
    <li className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="min-w-0 flex-1 text-sm text-[#e8e0dc]">
          {c.chapter} <span className="text-xs text-[#6b5c57]">· {c.questions} {c.questions === 1 ? "question" : "questions"}</span>
        </span>
        {c.videoId ? (
          <a
            href={`https://www.youtube.com/watch?v=${c.videoId}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-[#c9b8b2] underline-offset-2 hover:underline"
          >
            {c.videoId}
          </a>
        ) : null}
        <span className={`text-xs ${badge[1]}`}>{badge[0]}</span>
      </div>

      <details className="mt-1">
        <summary className="cursor-pointer select-none text-xs text-[#6b5c57] hover:text-[#c9b8b2]">Change…</summary>
        <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="bucket" value={c.bucket} />
          <input type="hidden" name="chapter" value={c.chapter} />
          <input name="video" placeholder="YouTube link or video id" className={`${INPUT} max-w-sm`} />
          <input name="language" placeholder="Language (optional)" className={`${INPUT} max-w-[10rem]`} />
          <button name="mode" value="set" type="submit" disabled={pending}
            className="rounded bg-[#8a6f66] px-3 py-1.5 text-xs font-semibold text-[#141010] disabled:opacity-50">
            Use this video
          </button>
          {c.videoId ? (
            <button name="mode" value="remove" type="submit" disabled={pending}
              className="rounded border border-[#6b3f3f] px-2.5 py-1.5 text-xs text-[#d98b8b] hover:bg-[#2a1c1c]">
              Remove the video
            </button>
          ) : null}
          {c.source === "changed" || c.source === "removed" ? (
            <button name="mode" value="restore" type="submit" disabled={pending}
              className="rounded border border-[#3a2f2c] px-2.5 py-1.5 text-xs text-[#c9b8b2] hover:bg-[#241c1a]">
              Restore the reviewed video
            </button>
          ) : null}
          <Alert state={state} />
        </form>
      </details>
    </li>
  );
}
