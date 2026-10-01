"use client";

import { useActionState, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Megaphone, Paperclip, X } from "lucide-react";
import { startPostUpload, takePostDown, writePost, type State } from "@/app/admin/actions";
import type { Batch } from "@/lib/admin/batches";
import type { Post, PostFile } from "@/lib/admin/posts";
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
function Preview({
  title,
  body,
  who,
  files,
}: {
  title: string;
  body: string;
  who: string;
  files: { name: string }[];
}) {
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
            {files.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#137565]"
                  >
                    <Paperclip size={13} aria-hidden className="shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-[12px] text-[#6B5B5D]">From KIDS · just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Write({ batches, canPostToAll }: { batches: Batch[]; canPostToAll: boolean }) {
  const [files, setFiles] = useState<Attached[]>([]);
  // Clears the attachments once a post has gone out, so the next post does not
  // try to claim the same Drive files a second time.
  const [state, action] = useActionState(async (prev: State, formData: FormData) => {
    const result = await writePost(prev, formData);
    if (result.ok) setFiles([]);
    return result;
  }, {});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const uploading = files.some((f) => f.status === "uploading");
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

        <Attachments files={files} setFiles={setFiles} />

        <div className="flex flex-wrap items-center gap-4">
          {uploading ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded bg-[#7B1E2B] px-4 py-2 text-sm font-semibold text-[#FDFBF7] opacity-50"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Waiting for the upload
            </button>
          ) : (
            <Submit>Post it</Submit>
          )}
          <Alert state={state} />
        </div>
        </div>

        <Preview
          title={title}
          body={body}
          who={who}
          files={files.filter((f) => f.status === "done")}
        />
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

      {post.files.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {post.files.map((f) => (
            <li key={f.id}>
              <FileLink file={f} />
            </li>
          ))}
        </ul>
      ) : null}

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

/* ------------------------------------------------------------ attachments --- */

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";
const MAX_FILES = 6;
const MAX_MB = 25;

/**
 * What a file is, by its extension first. Windows often reports no type at all
 * for a .docx and phones none for a .heic. The server checks the type again
 * against what Drive itself recorded, so nothing here is trusted.
 */
const BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

function mimeOf(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[ext] ?? file.type;
}

type Attached = {
  key: string;
  name: string;
  bytes: number;
  status: "uploading" | "done" | "failed";
  progress: number;
  driveId?: string;
  error?: string;
};

function size(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Send one file to Google Drive, straight from this browser.
 *
 * The server opens the upload and hands back a one-off address; the bytes go
 * there directly, never through Vercel (which refuses anything over 4.5 MB).
 * XMLHttpRequest rather than fetch, because fetch still cannot report upload
 * progress, and a teacher watching a 15 MB scan needs to see it moving.
 */
function sendToDrive(
  url: string,
  file: File,
  mime: string,
  onProgress: (fraction: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", mime);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const id = JSON.parse(xhr.responseText)?.id;
          if (id) return resolve(String(id));
        } catch {
          // falls through to the rejection below
        }
      }
      reject(new Error(`Drive answered ${xhr.status}.`));
    };
    xhr.onerror = () => reject(new Error("The connection dropped."));
    xhr.send(file);
  });
}

function Attachments({
  files,
  setFiles,
}: {
  files: Attached[];
  setFiles: React.Dispatch<React.SetStateAction<Attached[]>>;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");

  const patch = (key: string, change: Partial<Attached>) =>
    setFiles((all) => all.map((f) => (f.key === key ? { ...f, ...change } : f)));

  async function add(list: FileList | null) {
    setNotice("");
    const chosen = Array.from(list ?? []);
    if (picker.current) picker.current.value = "";

    const room = MAX_FILES - files.filter((f) => f.status !== "failed").length;
    if (chosen.length > room) setNotice(`At most ${MAX_FILES} files on one post.`);

    for (const file of chosen.slice(0, Math.max(0, room))) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      const mime = mimeOf(file);
      setFiles((all) => [
        ...all,
        { key, name: file.name, bytes: file.size, status: "uploading", progress: 0 },
      ]);

      if (file.size > MAX_MB * 1024 * 1024) {
        patch(key, { status: "failed", error: `Over ${MAX_MB} MB.` });
        continue;
      }

      try {
        const opened = await startPostUpload({ name: file.name, mime, bytes: file.size });
        if ("error" in opened) {
          patch(key, { status: "failed", error: opened.error });
          continue;
        }
        const driveId = await sendToDrive(opened.url, file, mime, (p) => patch(key, { progress: p }));
        patch(key, { status: "done", progress: 1, driveId });
      } catch (err) {
        patch(key, {
          status: "failed",
          error: err instanceof Error ? err.message : "The upload did not finish.",
        });
      }
    }
  }

  return (
    <div className="block">
      <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Notes, photos, papers</span>

      {files.length > 0 ? (
        <ul className="mb-2 space-y-1.5">
          {files.map((f) => (
            <li
              key={f.key}
              className="flex items-center gap-2 rounded border border-[#F2E9DA] bg-[#FDFBF7] px-3 py-2 text-sm"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-[#6B5B5D]" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span
                className={`shrink-0 text-xs ${f.status === "failed" ? "text-[#B22234]" : "text-[#6B5B5D]"}`}
              >
                {f.status === "uploading"
                  ? `${Math.round(f.progress * 100)}%`
                  : f.status === "failed"
                    ? f.error
                    : size(f.bytes)}
              </span>
              {f.status !== "uploading" ? (
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles((all) => all.filter((x) => x.key !== f.key))}
                  className="shrink-0 rounded p-0.5 text-[#6B5B5D] hover:text-[#B22234]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
              {f.status === "done" && f.driveId ? (
                <input type="hidden" name="file" value={f.driveId} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={picker}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />
      <button
        type="button"
        onClick={() => picker.current?.click()}
        className="inline-flex items-center gap-2 rounded border border-[#E3D6C4] bg-white px-3 py-1.5 text-sm font-semibold text-[#2B1A1C] hover:border-[#7B1E2B]"
      >
        <Paperclip className="h-3.5 w-3.5" aria-hidden />
        Attach a file
      </button>
      {notice ? <span className="ml-3 text-xs text-[#B22234]">{notice}</span> : null}
      <span className="mt-1 block text-xs text-[#6B5B5D]">
        Photos, PDFs, Word, PowerPoint or Excel, up to {MAX_MB} MB each. They are kept in the KIDS
        Google Drive, shared with nobody, and only the students who can see this post can open them.
      </span>
    </div>
  );
}

/** A file on a post in the console. Opens through the same gate the students use. */
function FileLink({ file }: { file: PostFile }) {
  const photo = file.mime.startsWith("image/");
  return (
    <a
      href={`/app/files/${file.id}`}
      target="_blank"
      rel="noopener"
      className="inline-flex max-w-[260px] items-center gap-1.5 rounded border border-[#E3D6C4] bg-[#FDFBF7] px-2.5 py-1 text-xs font-semibold text-[#2B1A1C] hover:border-[#7B1E2B]"
    >
      {photo ? (
        <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span className="truncate">{file.name}</span>
      <span className="shrink-0 font-normal text-[#6B5B5D]">{size(file.bytes)}</span>
    </a>
  );
}
