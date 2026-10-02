"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  FileSpreadsheet,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  discardQuestionDraftAction,
  loadQuestionSetAction,
  readQuestionSheetAction,
  saveQuestionDraftAction,
  uploadQuestionImageAction,
  type QuestionResult,
} from "@/app/admin/actions";
import { examImageUrl } from "@/lib/exam/question";
import {
  LETTERS,
  MAX_OPTIONS,
  MIN_OPTIONS,
  checkQuestions,
  type DraftQuestion,
} from "@/lib/exam/question-check";

/**
 * The question editor. Admin only -- the page that renders it checks.
 *
 * The questions live in this component's state while somebody types, and reach
 * the server only on "Save draft" or "Check and load". Nothing here is seen by
 * a student until a load succeeds; the summary at the top runs the server's
 * own checks on every change, so the office learns about an unticked answer
 * while looking at it rather than from a refusal.
 */

type Row = DraftQuestion & { id: number };

let nextId = 1;
const withId = (q: DraftQuestion): Row => ({ ...q, id: nextId++ });
const blank = (): Row => withId({ q: "", options: ["", "", "", ""], answer: null });
const strip = (rows: Row[]): DraftQuestion[] =>
  rows.map(({ section, context, q, options, answer, image, optionImages }) => ({
    section,
    context,
    q,
    options,
    answer,
    image,
    optionImages,
  }));

/**
 * Make a picture fit to upload. A phone photo of a diagram is often 4,000
 * pixels and 5 MB; a question needs perhaps 1,600 across, and every child's
 * phone downloads it on exam morning. Anything wider than that, or heavier than
 * 700 KB, is redrawn smaller as WebP. A small PNG -- most clean diagrams --
 * goes up untouched, so its lines stay crisp.
 */
const MAX_SIDE = 1600;
async function prepareImage(file: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
    throw new Error("Use a PNG, JPEG, WebP or GIF picture. (A PDF or SVG has to be saved as a picture first.)");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 700_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  // White behind a transparent diagram, or its black lines vanish on a dark phone.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.9));
  if (!blob) throw new Error("This browser could not shrink the picture. Try a smaller one.");
  return blob;
}

async function uploadPicture(file: File): Promise<string> {
  const data = new FormData();
  data.set("image", await prepareImage(file), file.name || "diagram");
  const r = await uploadQuestionImageAction(data);
  if (!r.ok) throw new Error(r.message);
  return r.id;
}

/** The picture in a paste, if the clipboard holds one (a screenshot, a copied figure). */
function pastedPicture(e: React.ClipboardEvent): File | null {
  for (const item of e.clipboardData.items) {
    if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

const TEXT =
  "w-full rounded border border-[#E3D6C4] bg-[#FDFBF7] px-3 py-2 text-sm text-[#2B1A1C] outline-none " +
  "placeholder:text-[#9A8B8D] focus:border-[#7B1E2B] disabled:bg-[#F6F1EA] [field-sizing:content]";

export default function QuestionEditor({
  paperId,
  code,
  initial,
  source: initialSource,
  version: initialVersion,
  loadedCount,
  locked,
  expectedCount,
}: {
  paperId: string;
  code: string;
  initial: DraftQuestion[];
  source: "draft" | "loaded" | "new";
  version: string | null;
  loadedCount: number | null;
  /** Students who have sat this set. Above zero, the editor is read-only. */
  locked: number;
  expectedCount: number | null;
}) {
  const [rows, setRows] = useState<Row[]>(() => (initial.length ? initial.map(withId) : locked ? [] : [blank()]));
  const [source, setSource] = useState(initialSource);
  const [version, setVersion] = useState(initialVersion);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [pending, start] = useTransition();
  /** Pictures on their way up, keyed "<row id>:q" or "<row id>:<option>". */
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const readOnly = locked > 0;

  const check = useMemo(() => checkQuestions(strip(rows), expectedCount), [rows, expectedCount]);
  const answered = check.spread.reduce((a, b) => a + b, 0);

  // Leaving with unsaved questions asks first. The browser words the dialog.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (next: Row[]) => {
    setRows(next);
    setDirty(true);
  };
  const edit = (i: number, patch: Partial<DraftQuestion>) =>
    change(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  /**
   * Upload a picture and attach it to a question (option === null) or one of
   * its options. By row id, not position: the office may reorder questions
   * while a photo is still going up.
   */
  const attach = async (rowId: number, option: number | null, file: File) => {
    const key = `${rowId}:${option ?? "q"}`;
    setUploading((u) => new Set(u).add(key));
    try {
      const id = await uploadPicture(file);
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          if (option === null) return { ...r, image: id };
          const pics = r.options.map((_, k) => r.optionImages?.[k] ?? null);
          pics[option] = id;
          return { ...r, optionImages: pics };
        }),
      );
      setDirty(true);
    } catch (err) {
      setResult({ ok: false, message: (err as Error).message || "The picture could not be uploaded." });
    } finally {
      setUploading((u) => {
        const next = new Set(u);
        next.delete(key);
        return next;
      });
    }
  };
  const detach = (i: number, option: number | null) => {
    const r = rows[i];
    if (option === null) return edit(i, { image: undefined });
    const pics = r.options.map((_, k) => r.optionImages?.[k] ?? null);
    pics[option] = null;
    edit(i, { optionImages: pics.some(Boolean) ? pics : undefined });
  };
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };

  const save = () =>
    start(async () => {
      const r = await saveQuestionDraftAction(paperId, code, strip(rows), version);
      setResult(r);
      if (r.ok) {
        setVersion(r.version ?? null);
        setSource("draft");
        setDirty(false);
      }
    });

  const load = () => {
    if (check.problems.length) {
      setResult({ ok: false, message: "Nothing was loaded. Fix these first:", problems: check.problems });
      return;
    }
    const replacing = loadedCount !== null ? ` This replaces the ${loadedCount} questions loaded now.` : "";
    if (!window.confirm(`Load these ${rows.length} questions into the paper?${replacing} Students of this set are handed exactly these when it opens.`)) return;
    start(async () => {
      const r = await loadQuestionSetAction(paperId, code, strip(rows), version);
      setResult(r);
      if (r.ok) {
        setSource("loaded");
        setVersion(null);
        setDirty(false);
      } else if (r.version) {
        // Saved, but the load was refused: the draft on the server is now this one.
        setVersion(r.version);
        setSource("draft");
        setDirty(false);
      }
    });
  };

  const discard = () => {
    if (!window.confirm(loadedCount !== null ? "Throw this draft away and go back to the loaded set?" : "Throw this draft away? Every question in it is lost.")) return;
    start(async () => {
      const r = await discardQuestionDraftAction(paperId, code);
      if (!r.ok) setResult(r);
      else {
        setDirty(false);
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-5 pb-24">
      {readOnly ? (
        <Banner tone="info">
          {locked} students have sat this set, so it cannot change: their marks depend on it. This is a view.
        </Banner>
      ) : source === "loaded" ? (
        <Banner tone="good">
          These are the questions loaded into the paper now. Edit them here; nothing reaches students until you load
          again.
        </Banner>
      ) : source === "draft" ? (
        <Banner tone="warn">
          This is a draft. Students see {loadedCount !== null ? `the ${loadedCount} questions loaded earlier` : "no paper for this set"} until
          you press <strong>Check and load</strong>.
        </Banner>
      ) : (
        <Banner tone="warn">A new set. Nothing is saved until you press Save draft.</Banner>
      )}

      {/* --------------------------------------------------- summary --- */}
      <section className="rounded-[14px] border border-[#F2E9DA] bg-white p-4 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span>
            <strong>{rows.length}</strong> question{rows.length === 1 ? "" : "s"}
            {expectedCount ? <span className="text-[#6B5B5D]"> of {expectedCount}</span> : null}
          </span>
          <span className="text-[#6B5B5D]">{answered} with an answer ticked</span>
          <span className="font-mono text-xs text-[#4A3A3C]">
            {check.spread
              .map((n, i) => [LETTERS[i], n] as const)
              .filter(([, n], i) => n > 0 || i < 4)
              .map(([l, n]) => `${l} ${n}`)
              .join(" · ")}
          </span>
        </div>
        {check.lopsided ? (
          <p className="mt-2 flex items-start gap-2 text-xs text-[#8A6D1F]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            More than half the answers are the same letter. Check the key was not typed wrong.
          </p>
        ) : null}
        {check.problems.length ? (
          <details className="mt-2 text-xs text-[#8A6D1F]">
            <summary className="cursor-pointer">
              {check.problems.length} thing{check.problems.length === 1 ? "" : "s"} to fix before it can be loaded
            </summary>
            <ul className="mt-1 list-disc pl-5">
              {check.problems.slice(0, 40).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {check.problems.length > 40 ? <li>…and {check.problems.length - 40} more</li> : null}
            </ul>
          </details>
        ) : rows.length ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-[#137565]">
            <Check className="h-3.5 w-3.5" aria-hidden /> Passes every check. Ready to load.
          </p>
        ) : null}
      </section>

      {!readOnly ? <SheetUpload rows={rows} onRead={(next) => change(next)} /> : null}

      {/* -------------------------------------------------- questions --- */}
      <ol className="space-y-4">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-[14px] border border-[#F2E9DA] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-bold">Q{i + 1}</span>
              {r.answer === null ? <span className="text-xs text-[#B22234]">no answer ticked</span> : null}
              {!readOnly ? (
                <div className="ml-auto flex items-center gap-1">
                  <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton
                    label="Delete question"
                    danger
                    onClick={() => {
                      if (r.q.trim() && !window.confirm(`Delete question ${i + 1}?`)) return;
                      change(rows.filter((_, j) => j !== i));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              ) : null}
            </div>

            <details open={Boolean(r.section || r.context)} className="mb-3">
              <summary className="cursor-pointer text-xs text-[#6B5B5D]">Section and passage (optional)</summary>
              <div className="mt-2 space-y-2">
                <input
                  className={TEXT}
                  placeholder="Section heading, e.g. Life Science"
                  value={r.section ?? ""}
                  disabled={readOnly}
                  onChange={(e) => edit(i, { section: e.target.value })}
                />
                <textarea
                  className={`${TEXT} min-h-[3rem]`}
                  placeholder="A passage shown above the question"
                  value={r.context ?? ""}
                  disabled={readOnly}
                  onChange={(e) => edit(i, { context: e.target.value })}
                />
              </div>
            </details>

            <textarea
              className={`${TEXT} min-h-[3rem]`}
              placeholder="The question — paste a screenshot here to add it as the diagram"
              value={r.q}
              disabled={readOnly}
              onChange={(e) => edit(i, { q: e.target.value })}
              onPaste={(e) => {
                const file = pastedPicture(e);
                if (!file) return;
                e.preventDefault();
                void attach(r.id, null, file);
              }}
            />

            <Picture
              id={r.image}
              busy={uploading.has(`${r.id}:q`)}
              readOnly={readOnly}
              label="Add a diagram"
              onFile={(f) => attach(r.id, null, f)}
              onRemove={() => detach(i, null)}
            />

            <fieldset className="mt-3 space-y-2">
              <legend className="mb-1 text-xs text-[#6B5B5D]">Options — tick the correct one</legend>
              {r.options.map((o, k) => (
                <div key={k} className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name={`answer-${r.id}`}
                      checked={r.answer === k}
                      disabled={readOnly}
                      onChange={() => edit(i, { answer: k })}
                      className="accent-[#137565]"
                    />
                    <span className={`w-4 text-sm font-semibold ${r.answer === k ? "text-[#137565]" : "text-[#6B5B5D]"}`}>
                      {LETTERS[k]}
                    </span>
                  </label>
                  <input
                    className={`${TEXT} ${r.answer === k ? "border-[#137565]" : ""}`}
                    placeholder={`Option ${LETTERS[k]}`}
                    value={o}
                    disabled={readOnly}
                    onChange={(e) => edit(i, { options: r.options.map((x, m) => (m === k ? e.target.value : x)) })}
                  />
                  <Picture
                    small
                    id={r.optionImages?.[k] ?? undefined}
                    busy={uploading.has(`${r.id}:${k}`)}
                    readOnly={readOnly}
                    label={`Picture for option ${LETTERS[k]}`}
                    onFile={(f) => attach(r.id, k, f)}
                    onRemove={() => detach(i, k)}
                  />
                  {!readOnly && r.options.length > MIN_OPTIONS ? (
                    <IconButton
                      label={`Remove option ${LETTERS[k]}`}
                      onClick={() => {
                        const pics = r.optionImages?.filter((_, m) => m !== k);
                        edit(i, {
                          options: r.options.filter((_, m) => m !== k),
                          optionImages: pics?.some(Boolean) ? pics : undefined,
                          // The tick follows its option, or goes if its option went.
                          answer: r.answer === null || r.answer === k ? null : r.answer > k ? r.answer - 1 : r.answer,
                        });
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </IconButton>
                  ) : null}
                </div>
              ))}
              {!readOnly && r.options.length < MAX_OPTIONS ? (
                <button
                  type="button"
                  onClick={() =>
                    edit(i, {
                      options: [...r.options, ""],
                      ...(r.optionImages ? { optionImages: [...r.optionImages, null] } : {}),
                    })
                  }
                  className="text-xs text-[#4A3A3C] underline-offset-2 hover:underline"
                >
                  + Add option {LETTERS[r.options.length]}
                </button>
              ) : null}
            </fieldset>
          </li>
        ))}
      </ol>

      {!readOnly ? (
        <button
          type="button"
          onClick={() => change([...rows, blank()])}
          className="inline-flex items-center gap-2 rounded border border-dashed border-[#C9B8A6] px-4 py-2 text-sm text-[#4A3A3C] hover:bg-white"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add a question
        </button>
      ) : null}

      {/* ------------------------------------------------- the bar --- */}
      {!readOnly ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#E3D6C4] bg-[#FBF7EF]/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending || uploading.size > 0}
              onClick={save}
              className="rounded border border-[#7B1E2B] px-4 py-2 text-sm font-semibold text-[#7B1E2B] disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={pending || uploading.size > 0}
              onClick={load}
              className="rounded bg-[#7B1E2B] px-4 py-2 text-sm font-semibold text-[#FDFBF7] disabled:opacity-50"
            >
              Check and load into the paper
            </button>
            {source === "draft" && !pending ? (
              <button type="button" onClick={discard} className="text-xs text-[#B22234] underline-offset-2 hover:underline">
                Throw draft away
              </button>
            ) : null}
            {pending ? <Loader2 className="h-4 w-4 animate-spin text-[#6B5B5D]" aria-label="Working" /> : null}
            <span className="ml-auto text-xs text-[#6B5B5D]">
              {uploading.size ? "Uploading a picture…" : dirty ? "Unsaved changes" : "Everything saved"}
            </span>
          </div>
          {result ? (
            <div className="mx-auto mt-2 max-w-4xl">
              <p className={`flex items-start gap-2 text-sm ${result.ok ? "text-[#137565]" : "text-[#B22234]"}`}>
                {result.ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                {result.message}
              </p>
              {result.problems?.length ? (
                <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-9 text-xs text-[#B22234]">
                  {result.problems.slice(0, 40).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Excel --- */

function SheetUpload({ rows, onRead }: { rows: Row[]; onRead: (rows: Row[]) => void }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<QuestionResult | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const hasQuestions = rows.some((r) => r.q.trim());

  return (
    <section className="rounded-[14px] border border-[#F2E9DA] bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <FileSpreadsheet className="h-4 w-4 text-[#137565]" aria-hidden /> From an Excel sheet
      </h2>
      <p className="mt-1 text-xs text-[#6B5B5D]">
        One question per row: Section, Passage, Question, Image, A, B, C, D (E and F if needed), and Answer as a
        letter. For a diagram, put the picture over that row&rsquo;s Image cell (Insert → Pictures → Place over
        Cells); over an option&rsquo;s cell, it becomes that option&rsquo;s picture.{" "}
        <a href="/admin/questions/template" className="text-[#7B1E2B] underline-offset-2 hover:underline">
          Download the template
        </a>
        . Reading a sheet saves nothing — the questions appear below for you to check, then you save.
      </p>
      <form
        ref={form}
        className="mt-3 flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const mode = String(data.get("mode"));
          if (mode === "replace" && hasQuestions && !window.confirm("Replace every question below with the sheet's?")) return;
          start(async () => {
            const r = await readQuestionSheetAction(data);
            setResult(r);
            if (r.ok && r.items) {
              const read = r.items.map(withId);
              const kept = rows.filter((x) => x.q.trim() || x.options.some((o) => o.trim()));
              onRead(mode === "append" ? [...kept, ...read] : read);
              form.current?.reset();
            }
          });
        }}
      >
        <input
          type="file"
          name="sheet"
          required
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="text-xs file:mr-3 file:rounded file:border file:border-[#E3D6C4] file:bg-[#FDFBF7] file:px-3 file:py-1.5 file:text-xs"
        />
        <select name="mode" defaultValue={hasQuestions ? "append" : "replace"} className="rounded border border-[#E3D6C4] bg-[#FDFBF7] px-2 py-1.5 text-xs">
          <option value="replace">Replace the questions below</option>
          <option value="append">Add to the end</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-[#E3D6C4] px-3 py-1.5 text-xs font-semibold text-[#4A3A3C] hover:bg-[#F6E9E9] disabled:opacity-50"
        >
          {pending ? "Reading…" : "Read the sheet"}
        </button>
      </form>
      {result ? (
        <div className="mt-2 text-xs">
          <p className={result.ok ? "text-[#137565]" : "text-[#B22234]"}>{result.message}</p>
          {result.problems?.length ? (
            <ul className="mt-1 list-disc pl-5 text-[#8A6D1F]">
              {result.problems.slice(0, 30).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {result.problems.length > 30 ? <li>…and {result.problems.length - 30} more</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------- pictures --- */

/**
 * A question's diagram or an option's picture: shown when there is one, a
 * button to add one when there is not. The preview comes from the same route a
 * phone uses; for an admin it is served at any time and never cached.
 */
function Picture({
  id,
  busy,
  readOnly,
  label,
  small,
  onFile,
  onRemove,
}: {
  id?: string;
  busy: boolean;
  readOnly: boolean;
  label: string;
  small?: boolean;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pick = (
    <input
      ref={input}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = "";
      }}
    />
  );

  if (busy) {
    return (
      <span className={`inline-flex items-center gap-2 text-xs text-[#6B5B5D] ${small ? "" : "mt-3"}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> {small ? "" : "Uploading…"}
      </span>
    );
  }

  if (id) {
    return (
      <div className={`relative shrink-0 ${small ? "" : "mt-3 inline-block"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a private, uncached admin preview */}
        <img
          src={examImageUrl(id)}
          alt={small ? label : "The question's diagram"}
          className={`rounded border border-[#E3D6C4] bg-white object-contain ${small ? "h-10 w-14" : "max-h-72 max-w-full"}`}
        />
        {!readOnly ? (
          <button
            type="button"
            title="Remove the picture"
            aria-label="Remove the picture"
            onClick={onRemove}
            className="absolute -right-2 -top-2 rounded-full border border-[#E8C9CC] bg-white p-0.5 text-[#B22234]"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    );
  }

  if (readOnly) return null;
  return small ? (
    <>
      {pick}
      <IconButton label={label} onClick={() => input.current?.click()}>
        <ImagePlus className="h-3.5 w-3.5" />
      </IconButton>
    </>
  ) : (
    <div className="mt-2">
      {pick}
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 text-xs text-[#4A3A3C] underline-offset-2 hover:underline"
      >
        <ImagePlus className="h-3.5 w-3.5" aria-hidden /> {label}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ bits --- */

function Banner({ tone, children }: { tone: "good" | "warn" | "info"; children: React.ReactNode }) {
  const style =
    tone === "good"
      ? "border-[#BFDCD5] bg-[#EAF5F2] text-[#0F5C50]"
      : tone === "warn"
        ? "border-[#EAD9A8] bg-[#FBF4E2] text-[#6E5512]"
        : "border-[#E3D6C4] bg-white text-[#4A3A3C]";
  return <p className={`rounded-[10px] border px-4 py-3 text-sm ${style}`}>{children}</p>;
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded border p-1.5 disabled:opacity-30 ${
        danger ? "border-[#E8C9CC] text-[#B22234] hover:bg-[#FBE9EA]" : "border-[#E3D6C4] text-[#4A3A3C] hover:bg-[#F6E9E9]"
      }`}
    >
      {children}
    </button>
  );
}
