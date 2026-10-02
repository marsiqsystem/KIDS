"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  ImageOff,
  ImagePlus,
  Loader2,
  Lock,
  PencilLine,
  Plus,
  Trash2,
  X,
  XCircle,
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
  questionsPerStudent,
  subjectsOf,
  type DraftQuestion,
  type SetChoice,
} from "@/lib/exam/question-check";
import ConfirmDialog from "./ConfirmDialog";

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
/** A new question, in the same subject as the one before it -- questions are written a subject at a time. */
const blank = (section?: string): Row =>
  withId({ ...(section ? { section } : {}), q: "", options: ["", "", "", ""], answer: null });
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

/** A subject to offer while typing; `note` names the stream when it is another one's. */
export type Suggestion = { name: string; note?: string };

const FIELD =
  "w-full rounded-[9px] border-[1.5px] border-[#F2E9DA] bg-white px-3 text-[13.5px] text-[#2B1A1C] outline-none " +
  "placeholder:text-[#A79B9C] focus:border-[#7B1E2B] focus:shadow-[0_0_0_3px_rgba(123,30,43,0.12)] disabled:bg-[#FBF7EF]";
const AREA = `${FIELD} min-h-[58px] py-2.5 [field-sizing:content]`;
const LABEL = "text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5B5D]";
const CARD = "rounded-xl border border-[#F2E9DA] bg-white";

export default function QuestionEditor({
  paperId,
  code,
  initial,
  source: initialSource,
  version: initialVersion,
  loadedCount: initialLoaded,
  locked,
  expectedCount,
  initialChoice,
  suggestions,
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
  initialChoice: SetChoice | null;
  /** Subject names to offer while typing: July's, for this class. */
  suggestions: Suggestion[];
}) {
  const [rows, setRows] = useState<Row[]>(() => (initial.length ? initial.map(withId) : locked ? [] : [blank()]));
  const [source, setSource] = useState(initialSource);
  const [version, setVersion] = useState(initialVersion);
  // What is in the paper now. Moves on every successful load, so a second load
  // says how many it replaces truthfully.
  const [loadedCount, setLoadedCount] = useState(initialLoaded);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<QuestionResult | null>(null);
  /** A refused load's own list, shown in the summary card where the eye already is. */
  const [refused, setRefused] = useState<string[] | null>(null);
  const [showProblems, setShowProblems] = useState(false);
  const [asking, setAsking] = useState<"load" | "discard" | null>(null);
  const [pending, start] = useTransition();
  /** Pictures on their way up, keyed "<row id>:q" or "<row id>:<option>". */
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const readOnly = locked > 0;
  /** Questions whose passage box the office has opened, though it is still empty. */
  const [openPassages, setOpenPassages] = useState<Set<number>>(new Set());
  const togglePassage = (id: number) =>
    setOpenPassages((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const [choiceRaw, setChoice] = useState<SetChoice | null>(initialChoice);
  const subjects = useMemo(() => subjectsOf(rows), [rows]);
  // A subject renamed on every question stops existing; it stops being optional
  // with it, rather than lingering as a name nobody can see to untick.
  const choice = useMemo<SetChoice | null>(() => {
    if (!choiceRaw) return null;
    const optional = choiceRaw.optional.filter((o) => subjects.some((s) => s.name === o && o));
    return optional.length ? { optional, choose: choiceRaw.choose } : null;
  }, [choiceRaw, subjects]);
  const check = useMemo(() => checkQuestions(strip(rows), expectedCount, choice), [rows, expectedCount, choice]);
  const answered = check.spread.reduce((a, b) => a + b, 0);
  const problems = refused ?? check.problems;

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
    setRefused(null);
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
      const r = await saveQuestionDraftAction(paperId, code, strip(rows), choice, version);
      setResult(r);
      if (r.ok) {
        setVersion(r.version ?? null);
        setSource("draft");
        setDirty(false);
      }
    });

  const askToLoad = () => {
    if (check.problems.length) {
      setShowProblems(true);
      setResult({ ok: false, message: "Nothing was loaded. The summary at the top lists what to fix." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setAsking("load");
  };

  const load = () =>
    start(async () => {
      const r = await loadQuestionSetAction(paperId, code, strip(rows), choice, version);
      setAsking(null);
      setResult(r);
      if (r.ok) {
        setSource("loaded");
        setVersion(null);
        setDirty(false);
        setLoadedCount(rows.length);
      } else {
        if (r.version) {
          // Saved, but the load was refused: the draft on the server is now this one.
          setVersion(r.version);
          setSource("draft");
          setDirty(false);
        }
        if (r.problems?.length) {
          setRefused(r.problems);
          setShowProblems(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    });

  const discard = () =>
    start(async () => {
      const r = await discardQuestionDraftAction(paperId, code);
      setAsking(null);
      if (!r.ok) setResult(r);
      else {
        setDirty(false);
        window.location.reload();
      }
    });

  return (
    <div className="space-y-4">
      <Banner source={source} locked={locked} loadedCount={loadedCount} />

      {/* --------------------------------------------------- summary --- */}
      <section className={`${CARD} px-5 py-4`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="text-[15px]">
            <strong className="tabular-nums">{rows.length}</strong> question{rows.length === 1 ? "" : "s"}
          </div>
          <div className="text-[15px]">
            <strong className="tabular-nums">{answered}</strong> with an answer ticked
          </div>
          <div className="font-mono text-sm text-[#6B5B5D]">
            {check.spread
              .map((count, i) => [LETTERS[i], count] as const)
              .filter(([, count], i) => count > 0 || i < 4)
              .map(([l, count]) => `${l} ${count}`)
              .join(" · ")}
          </div>
          <div className="flex-1" />
          {problems.length ? (
            <button
              type="button"
              onClick={() => setShowProblems((v) => !v)}
              aria-expanded={showProblems}
              className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#7B1E2B]"
            >
              <AlertCircle size={17} aria-hidden />
              {problems.length} thing{problems.length === 1 ? "" : "s"} to fix before it can be loaded
              {showProblems ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
            </button>
          ) : rows.length ? (
            <span className="flex items-center gap-2 rounded-lg bg-[#E6F4F1] px-3 py-1.5 text-[13.5px] font-bold text-[#167A6C]">
              <Check size={17} aria-hidden /> Passes every check. Ready to load.
            </span>
          ) : null}
        </div>
        {check.lopsided ? (
          <p className="mt-2 flex items-start gap-2 text-xs text-[#8A6A24]">
            <AlertCircle className="mt-0.5 shrink-0" size={14} aria-hidden />
            More than half the answers are the same letter. Check the key was not typed wrong.
          </p>
        ) : null}
        {problems.length && showProblems ? (
          <ul className="mt-3 grid gap-1.5 border-t border-[#F7F1E6] pt-3 text-[13px]">
            {problems.slice(0, 40).map((p) => (
              <li key={p}>{p.replace(/\.$/, "")}</li>
            ))}
            {problems.length > 40 ? <li className="text-[#6B5B5D]">…and {problems.length - 40} more</li> : null}
          </ul>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <SubjectsPanel
          subjects={subjects}
          choice={choice}
          readOnly={readOnly}
          perStudent={questionsPerStudent(rows, choice)}
          onChange={(next) => {
            setChoice(next);
            setDirty(true);
            setRefused(null);
          }}
        />
        {!readOnly ? <SheetUpload rows={rows} onRead={(next) => change(next)} /> : null}
      </div>

      {/* -------------------------------------------------- questions --- */}
      <ol className="space-y-4">
        {rows.map((r, i) => {
          const flagged = !readOnly && r.answer === null;
          return (
            <li
              key={r.id}
              className={`grid gap-3 rounded-xl bg-white px-5 py-4 ${flagged ? "border-[1.5px] border-[#7B1E2B]" : "border border-[#F2E9DA]"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-bold text-[#7B1E2B]">Q{i + 1}</span>
                {flagged ? (
                  <span className="rounded-md bg-[#B22234] px-2 py-0.5 text-[11.5px] font-bold text-white">No answer ticked</span>
                ) : null}
                <div className="flex-1" />
                {!readOnly ? (
                  <>
                    <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp size={17} />
                    </IconButton>
                    <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>
                      <ArrowDown size={17} />
                    </IconButton>
                    <IconButton
                      label="Delete question"
                      danger
                      onClick={() => {
                        if (r.q.trim() && !window.confirm(`Delete question ${i + 1}?`)) return;
                        change(rows.filter((_, j) => j !== i));
                      }}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </>
                ) : null}
              </div>

              <SubjectField
                value={r.section ?? ""}
                readOnly={readOnly}
                optional={Boolean(choice?.optional.includes((r.section ?? "").trim()))}
                suggestions={[
                  ...subjects.filter((s) => s.name).map((s) => ({ name: s.name })),
                  ...suggestions,
                ]}
                passageOpen={Boolean(r.context) || openPassages.has(r.id)}
                onPassage={() => togglePassage(r.id)}
                onChange={(v) => edit(i, { section: v })}
              />

              {r.context || openPassages.has(r.id) ? (
                <textarea
                  className={AREA}
                  placeholder="A passage shown above the question"
                  aria-label="Passage"
                  value={r.context ?? ""}
                  disabled={readOnly}
                  onChange={(e) => edit(i, { context: e.target.value })}
                />
              ) : null}

              <textarea
                className={`${AREA} ${r.q ? "" : "border-dashed border-[#D9CDBB]"}`}
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

              <Diagram
                id={r.image}
                busy={uploading.has(`${r.id}:q`)}
                readOnly={readOnly}
                onFile={(f) => attach(r.id, null, f)}
                onRemove={() => detach(i, null)}
              />

              <fieldset className="grid gap-[7px]">
                <legend className="sr-only">Options — tick the correct one</legend>
                {r.options.map((o, k) => {
                  const on = r.answer === k;
                  const pic = r.optionImages?.[k] ?? null;
                  const busy = uploading.has(`${r.id}:${k}`);
                  return (
                    <div
                      key={k}
                      className={`flex items-center gap-2.5 rounded-[9px] border-[1.5px] px-2.5 py-[7px] text-[13.5px] ${
                        on ? "border-[#1E9E8C] bg-[#E6F4F1]" : "border-[#F2E9DA] bg-white"
                      }`}
                    >
                      <label className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="radio"
                          name={`answer-${r.id}`}
                          checked={on}
                          disabled={readOnly}
                          onChange={() => edit(i, { answer: k })}
                          className="h-4 w-4 accent-[#1E9E8C]"
                          aria-label={`Option ${LETTERS[k]} is correct`}
                        />
                        <strong className="w-4">{LETTERS[k]}</strong>
                      </label>
                      {busy ? (
                        <Loader2 size={16} className="animate-spin text-[#6B5B5D]" aria-label="Uploading" />
                      ) : pic ? (
                        <span className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element -- a private, uncached admin preview */}
                          <img src={examImageUrl(pic)} alt={`Option ${LETTERS[k]}`} className="h-[38px] w-14 rounded-[5px] border border-[#F2E9DA] bg-white object-contain" />
                        </span>
                      ) : null}
                      <input
                        className="min-w-0 flex-1 bg-transparent py-1 outline-none placeholder:text-[#A79B9C]"
                        placeholder={pic ? "picture only — or add words" : `Option ${LETTERS[k]}`}
                        value={o}
                        disabled={readOnly}
                        onChange={(e) => edit(i, { options: r.options.map((x, m) => (m === k ? e.target.value : x)) })}
                      />
                      {!readOnly ? (
                        pic ? (
                          <IconButton label={`Remove the picture from option ${LETTERS[k]}`} onClick={() => detach(i, k)}>
                            <ImageOff size={16} />
                          </IconButton>
                        ) : (
                          <PickPicture label={`Picture for option ${LETTERS[k]}`} onFile={(f) => attach(r.id, k, f)} />
                        )
                      ) : null}
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
                          <X size={16} />
                        </IconButton>
                      ) : null}
                    </div>
                  );
                })}
                {!readOnly && r.options.length < MAX_OPTIONS ? (
                  <button
                    type="button"
                    onClick={() =>
                      edit(i, {
                        options: [...r.options, ""],
                        ...(r.optionImages ? { optionImages: [...r.optionImages, null] } : {}),
                      })
                    }
                    className="justify-self-start pl-1 text-[12.5px] font-semibold text-[#7B1E2B] hover:underline"
                  >
                    + Add option {LETTERS[r.options.length]}
                  </button>
                ) : null}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {!readOnly ? (
        <button
          type="button"
          onClick={() => change([...rows, blank(rows[rows.length - 1]?.section)])}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#D9CDBB] text-sm font-semibold text-[#7B1E2B] hover:bg-white"
        >
          <Plus size={17} aria-hidden /> Add a question
        </button>
      ) : null}

      {/* ------------------------------------------------- the bar --- */}
      {!readOnly ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#F2E9DA] bg-white py-3.5 shadow-[0_-4px_12px_rgba(43,26,28,0.06)]">
          <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-3 px-8">
            <button
              type="button"
              disabled={pending || uploading.size > 0}
              onClick={save}
              className="h-[42px] rounded-[10px] border-[1.5px] border-[#7B1E2B] px-[18px] text-sm font-semibold text-[#7B1E2B] disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={pending || uploading.size > 0}
              onClick={askToLoad}
              className="h-[42px] rounded-[10px] bg-[#7B1E2B] px-[18px] text-sm font-semibold text-[#FDFBF7] disabled:opacity-50"
            >
              Check and load into the paper
            </button>
            {source === "draft" && !pending ? (
              <button type="button" onClick={() => setAsking("discard")} className="ml-1.5 text-[13px] font-semibold text-[#B22234] hover:underline">
                Throw draft away
              </button>
            ) : null}
            <div className="flex-1" />
            <span className="flex items-center gap-1.5 text-[13px] text-[#6B5B5D]">
              {uploading.size || pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
              {uploading.size ? "Uploading a picture…" : pending ? "Working…" : dirty ? "Unsaved changes" : "Everything saved"}
            </span>
          </div>
          {result ? (
            <p
              role="status"
              className={`mx-auto mt-2 flex max-w-[1000px] items-start gap-2 px-8 text-[13px] ${result.ok ? "text-[#167A6C]" : "text-[#B22234]"}`}
            >
              {result.ok ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
              {result.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={asking === "load"}
        title={`Load these ${rows.length} questions into the paper?`}
        cancel="Not yet"
        confirm="Load them"
        busy={pending}
        onCancel={() => setAsking(null)}
        onConfirm={load}
      >
        {loadedCount !== null ? `This replaces the ${loadedCount} loaded now.` : "Students of this set are handed exactly these when the paper opens."}
      </ConfirmDialog>
      <ConfirmDialog
        open={asking === "discard"}
        title="Throw this draft away?"
        cancel="Keep it"
        confirm="Throw it away"
        danger
        busy={pending}
        onCancel={() => setAsking(null)}
        onConfirm={discard}
      >
        {loadedCount !== null
          ? `The ${loadedCount} questions in the paper stay as they are.`
          : "Every question in it is lost. Nothing is in the paper yet."}
      </ConfirmDialog>
    </div>
  );
}

/* ---------------------------------------------------------------- banner --- */

/** The four states of a set, board 17 A3. */
function Banner({ source, locked, loadedCount }: { source: "draft" | "loaded" | "new"; locked: number; loadedCount: number | null }) {
  if (locked) {
    return (
      <p className="flex items-center gap-3 rounded-xl bg-[#EEEAE4] px-4 py-3 text-[13.5px] text-[#2B1A1C]">
        <Lock size={18} className="shrink-0" aria-hidden />
        <span>
          <strong>Locked view.</strong> {locked.toLocaleString("en-IN")} students have sat this set. It cannot change.
        </span>
      </p>
    );
  }
  if (source === "draft") {
    return (
      <p className="flex items-center gap-3 rounded-xl border border-[#E5BE7A] bg-[#FAF1DC] px-4 py-3 text-[13.5px] text-[#3D0A10]">
        <PencilLine size={18} className="shrink-0" aria-hidden />
        <span>
          <strong>Draft.</strong> Students see {loadedCount !== null ? `the ${loadedCount} questions loaded earlier` : "no paper for this set"} until
          you press <strong>Check and load</strong>.
        </span>
      </p>
    );
  }
  if (source === "loaded") {
    return (
      <p className="flex items-center gap-3 rounded-xl bg-[#E6F4F1] px-4 py-3 text-[13.5px] text-[#0F5C50]">
        <CheckCircle2 size={18} className="shrink-0" aria-hidden />
        <span>
          <strong>Loaded.</strong> These are the questions in the paper now. Edits reach students only when you load again.
        </span>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-3 rounded-xl border border-[#F2E9DA] bg-white px-4 py-3 text-[13.5px] text-[#2B1A1C]">
      <Plus size={18} className="shrink-0" aria-hidden />
      <span>
        <strong>New set.</strong> Nothing saved yet.
      </span>
    </p>
  );
}

/* -------------------------------------------------------------- subjects --- */

/**
 * The paper's subjects, and which of them a student chooses among -- July's
 * written paper for XI and XII. Ticking a subject optional is all it takes; the
 * app asks each student for their choice as the paper opens.
 */
function SubjectsPanel({
  subjects,
  choice,
  readOnly,
  perStudent,
  onChange,
}: {
  subjects: { name: string; count: number }[];
  choice: SetChoice | null;
  readOnly: boolean;
  perStudent: number;
  onChange: (next: SetChoice | null) => void;
}) {
  const optional = choice?.optional ?? [];
  const toggle = (name: string, on: boolean) => {
    const next = on ? [...optional, name] : optional.filter((o) => o !== name);
    if (!next.length) return onChange(null);
    // Keep the set's own order, so students see subjects as the paper lists them.
    const ordered = subjects.map((s) => s.name).filter((n) => next.includes(n));
    const choose = Math.min(choice?.choose ?? 3, Math.max(1, ordered.length - 1));
    onChange({ optional: ordered, choose });
  };

  // The size most optional subjects share; any other size is the odd one out.
  const sizes = subjects.filter((s) => optional.includes(s.name)).map((s) => s.count);
  const usual = sizes.length
    ? [...new Set(sizes)].sort((a, b) => sizes.filter((x) => x === b).length - sizes.filter((x) => x === a).length)[0]
    : null;
  const even = new Set(sizes).size <= 1;

  return (
    <section className={`${CARD} px-5 py-4`}>
      <div className={`${LABEL} mb-3`}>Subjects</div>
      {subjects.length === 1 && !subjects[0].name ? (
        <p className="text-[13px] leading-relaxed text-[#6B5B5D]">
          No question has a subject yet. Give each one a subject — for Class XI and XII the compulsory part (English &amp;
          General Knowledge) and each optional subject — then tick the optional ones here.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_56px_150px] items-center gap-x-3 gap-y-2 text-[13px]">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#6B5B5D]">Subject</div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#6B5B5D]">Qs</div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#6B5B5D]">Students choose it</div>
            {subjects.map((s) => {
              const on = optional.includes(s.name);
              const odd = on && usual !== null && s.count !== usual;
              return (
                <Fragment key={s.name || "(none)"}>
                  <div className="truncate">{s.name || <span className="text-[#8A6A24]">(no subject)</span>}</div>
                  <div className={`tabular-nums ${odd ? "font-bold text-[#7B1E2B]" : ""}`}>{s.count}</div>
                  {s.name ? (
                    <label className="flex cursor-pointer items-center gap-[7px] text-[#2B1A1C]">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={readOnly}
                        onChange={(e) => toggle(s.name, e.target.checked)}
                        className="h-4 w-4 accent-[#7B1E2B]"
                      />
                      {on ? "Optional" : <span className="text-[#6B5B5D]">Everyone answers it</span>}
                    </label>
                  ) : (
                    <span className="text-[#6B5B5D]">Everyone answers it</span>
                  )}
                </Fragment>
              );
            })}
          </div>

          {choice ? (
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-[#F7F1E6] pt-3 text-[13px]">
              Each student chooses
              <select
                value={choice.choose}
                disabled={readOnly}
                onChange={(e) => onChange({ ...choice, choose: Number(e.target.value) })}
                className="rounded-[7px] border-[1.5px] border-[#F2E9DA] bg-white px-1.5 py-0.5 font-bold"
              >
                {Array.from({ length: Math.max(1, choice.optional.length - 1) }, (_, k) => k + 1).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              of the {choice.optional.length} optional subjects, when the paper opens.
            </div>
          ) : null}
          <div className="mt-2.5 font-[family-name:var(--font-newsreader)] text-xl text-[#7B1E2B]">
            Each student answers {perStudent} questions
          </div>
          {choice ? (
            <div className={`mt-2.5 flex items-center gap-2 text-[12.5px] font-semibold ${even ? "text-[#167A6C]" : "text-[#7B1E2B]"}`}>
              {even ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
              Optional subjects have equal questions
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * The Subject box: always shown, suggesting as you type -- the set's own
 * subjects first, then July's for the class, with another stream's subjects
 * named as such ("Philosophy · Arts").
 */
function SubjectField({
  value,
  readOnly,
  optional,
  suggestions,
  passageOpen,
  onPassage,
  onChange,
}: {
  value: string;
  readOnly: boolean;
  optional: boolean;
  suggestions: Suggestion[];
  passageOpen: boolean;
  onPassage: () => void;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const typed = value.trim().toLowerCase();
  const seen = new Set<string>();
  const list = suggestions
    .filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return s.name.toLowerCase() !== typed && (!typed || s.name.toLowerCase().startsWith(typed));
    })
    .slice(0, 8);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative w-full max-w-[320px]">
        <input
          className={`${FIELD} h-[38px]`}
          placeholder="Subject, e.g. Physics"
          aria-label="Subject"
          value={value}
          disabled={readOnly}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
        />
        {open && !readOnly && list.length ? (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-[9px] border border-[#F2E9DA] bg-white text-[13px] shadow-[0_4px_12px_rgba(43,26,28,0.1)]">
            {list.map((s, k) => (
              <li key={s.name}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s.name);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left hover:bg-[#FBF7EF] ${k === 0 ? "bg-[#FBF7EF]" : ""} ${s.note ? "text-[#6B5B5D]" : ""}`}
                >
                  {s.name}
                  {s.note ? ` · ${s.note}` : ""}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {optional ? (
        <span className="rounded-md bg-[#FAF1DC] px-2 py-0.5 text-[11.5px] font-bold text-[#7B1E2B]">Optional</span>
      ) : null}
      {!readOnly ? (
        <button
          type="button"
          onClick={onPassage}
          aria-expanded={passageOpen}
          className="ml-2 flex items-center gap-1 text-[12.5px] text-[#6B5B5D] hover:text-[#7B1E2B]"
        >
          {passageOpen ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
          Passage
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- pictures --- */

/** The question's diagram: shown on white with a remove button, or a way to add one. */
function Diagram({
  id,
  busy,
  readOnly,
  onFile,
  onRemove,
}: {
  id?: string;
  busy: boolean;
  readOnly: boolean;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  if (busy) {
    return (
      <div className="flex items-center gap-2.5 text-[13px] text-[#6B5B5D]">
        <Loader2 size={16} className="animate-spin" aria-hidden /> Uploading the diagram…
      </div>
    );
  }
  if (id) {
    return (
      <div className="relative w-fit max-w-full rounded-[9px] border border-[#F2E9DA] bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- a private, uncached admin preview */}
        <img src={examImageUrl(id)} alt="The question's diagram" className="block max-h-72 max-w-full object-contain" />
        {!readOnly ? (
          <button
            type="button"
            title="Remove the diagram"
            aria-label="Remove the diagram"
            onClick={onRemove}
            className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border border-[#F2E9DA] bg-white text-[#B22234] hover:bg-[#FBE9EA]"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
    );
  }
  if (readOnly) return null;
  return <PickPicture label="Add a diagram" wide onFile={onFile} />;
}

/** A file picker for one picture, as an icon button or a labelled link. */
function PickPicture({ label, wide, onFile }: { label: string; wide?: boolean; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
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
      {wide ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-fit items-center gap-1.5 text-[12.5px] text-[#6B5B5D] hover:text-[#7B1E2B]"
        >
          <ImagePlus size={16} aria-hidden /> {label}
        </button>
      ) : (
        <IconButton label={label} onClick={() => input.current?.click()}>
          <ImageIcon size={16} />
        </IconButton>
      )}
    </>
  );
}

/* ----------------------------------------------------------------- Excel --- */

function SheetUpload({ rows, onRead }: { rows: Row[]; onRead: (rows: Row[]) => void }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const hasQuestions = rows.some((r) => r.q.trim());
  const [mode, setMode] = useState<"replace" | "append">(hasQuestions ? "append" : "replace");
  const [confirmReplace, setConfirmReplace] = useState<FormData | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const read = (data: FormData) =>
    start(async () => {
      const r = await readQuestionSheetAction(data);
      setResult(r);
      setConfirmReplace(null);
      if (r.ok && r.items) {
        const got = r.items.map(withId);
        const kept = rows.filter((x) => x.q.trim() || x.options.some((o) => o.trim()));
        onRead(mode === "append" ? [...kept, ...got] : got);
        form.current?.reset();
        setFileName(null);
      }
    });

  return (
    <section className={`${CARD} flex flex-col gap-3 px-5 py-4`}>
      <div className={LABEL}>From an Excel sheet</div>
      {/* A plain link with `download`: the route answers with the file itself. */}
      <a
        href="/admin/questions/template"
        download
        className="flex h-12 items-center justify-center gap-2.5 rounded-[11px] bg-[#1D6B3F] text-[15px] font-bold text-white hover:bg-[#175733]"
      >
        <Download size={19} aria-hidden /> Download the Excel template
      </a>
      <ol className="grid gap-[7px] text-[12.5px] leading-snug">
        {[
          "Download and fill one question per row",
          "For a diagram, place the picture over the row’s Image cell",
          "Choose the file and press Read the sheet — nothing is saved until you check and save",
        ].map((t, k) => (
          <li key={k} className="flex gap-2.5">
            <span className="font-bold text-[#7B1E2B]">{k + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <form
        ref={form}
        className="grid gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          if (mode === "replace" && hasQuestions) setConfirmReplace(data);
          else read(data);
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[9px] border-[1.5px] border-dashed border-[#D9CDBB] px-2.5 text-left text-[12.5px] hover:border-[#7B1E2B]"
          >
            <FileSpreadsheet size={16} className="shrink-0 text-[#1D6B3F]" aria-hidden />
            <span className={`truncate ${fileName ? "" : "text-[#6B5B5D]"}`}>{fileName ?? "Choose the filled sheet (.xlsx)"}</span>
          </button>
          <input
            ref={picker}
            type="file"
            name="sheet"
            required
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <button
            type="submit"
            disabled={pending || !fileName}
            className="h-9 shrink-0 rounded-[9px] border-[1.5px] border-[#7B1E2B] px-3 text-[12.5px] font-semibold text-[#7B1E2B] disabled:opacity-40"
          >
            {pending ? "Reading…" : "Read the sheet"}
          </button>
        </div>
        <div className="flex flex-wrap gap-3.5 text-[12.5px]">
          {(["replace", "append"] as const).map((m) => (
            <label key={m} className={`flex cursor-pointer items-center gap-1.5 ${mode === m ? "" : "text-[#6B5B5D]"}`}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="accent-[#7B1E2B]" />
              {m === "replace" ? "Replace the questions below" : "Add to the end"}
            </label>
          ))}
        </div>
      </form>
      {result ? (
        <div className="rounded-[9px] bg-[#FBF7EF] px-3 py-2.5 text-[12.5px] leading-normal">
          <strong className={result.ok ? "" : "text-[#B22234]"}>{result.message}</strong>
          {result.problems?.length ? (
            <ul className="mt-1 text-[#7B1E2B]">
              {result.problems.slice(0, 30).map((p) => (
                <li key={p}>{p}</li>
              ))}
              {result.problems.length > 30 ? <li>…and {result.problems.length - 30} more</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmReplace !== null}
        title="Replace every question below with the sheet’s?"
        cancel="Keep mine"
        confirm="Replace them"
        danger
        busy={pending}
        onCancel={() => setConfirmReplace(null)}
        onConfirm={() => confirmReplace && read(confirmReplace)}
      >
        The questions on this page are swapped for the sheet&rsquo;s. Nothing is saved until you press Save draft.
      </ConfirmDialog>
    </section>
  );
}

/* ------------------------------------------------------------------ bits --- */

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
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md disabled:opacity-30 ${
        danger ? "text-[#6B5B5D] hover:bg-[#FBE9EA] hover:text-[#B22234]" : "text-[#6B5B5D] hover:bg-[#FBF7EF] hover:text-[#2B1A1C]"
      }`}
    >
      {children}
    </button>
  );
}
