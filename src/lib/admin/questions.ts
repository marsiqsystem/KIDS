import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { sql } from "@/lib/exam/db";
import { loadQuestionSets } from "@/lib/exam/question-sets";
import {
  LETTERS,
  MAX_OPTIONS,
  checkQuestions,
  imagesUsed,
  parseSetCode,
  tidy,
  type DraftQuestion,
} from "@/lib/exam/question-check";
import { IMAGE_ID } from "@/lib/exam/question";
import { missingImages, storeImage } from "./question-images";
import { logAdminEvent } from "./staff";

/**
 * Question sets, written in the control centre.
 *
 * ⚠️ SERVER ONLY, and ADMIN ONLY. Everything here carries the answer key. The
 * pages and actions that call it check `role === "admin"` first; a teacher who
 * is also an invigilator must never be able to read a paper before it opens.
 *
 * The life of a set:
 *
 *   draft (exam_question_drafts)  --"Check and load"-->  loaded (exam_question_sets)
 *
 * Loading runs the same checks as scripts/load-question-set.ts and refuses a
 * set somebody has already sat, because their marks depend on it. Editing a
 * loaded set starts a fresh draft from it; the loaded copy stays exactly as it
 * was until the next load, so a half-finished edit never reaches a child.
 */

export type Version = string;

export interface EditablePaper {
  id: string;
  code: string;
  name: string;
  question_count: number | null;
  starts_at: Date | null;
}

export interface SetSummary {
  code: string;
  /** Questions in the LOADED set; null if only a draft exists. */
  loaded_count: number | null;
  loaded_at: Date | null;
  loaded_by: string | null;
  /** Questions in the draft; null if there is no draft. */
  draft_count: number | null;
  draft_at: Date | null;
  draft_by: string | null;
  attempts: number;
}

export async function editablePaper(id: string): Promise<EditablePaper | null> {
  if (!/^\d+$/.test(id)) return null;
  const [p] = (await sql`
    select pa.id::text, pa.code, pa.name, pa.question_count, pa.starts_at
      from exam_papers pa join exam_phases ph on ph.id = pa.phase_id
     where pa.id = ${id}::bigint and pa.archived_at is null
       and pa.mode = 'online' and ph.code <> 'P1'
  `) as EditablePaper[];
  return p ?? null;
}

export async function setsForPaper(paperId: string): Promise<SetSummary[]> {
  return (await sql`
    with codes as (
      select code from exam_question_sets where exam_paper_id = ${paperId}::bigint
      union
      select code from exam_question_drafts where exam_paper_id = ${paperId}::bigint
    )
    select c.code,
           s.question_count as loaded_count, s.loaded_at, s.loaded_by,
           jsonb_array_length(d.items) as draft_count, d.updated_at as draft_at, d.updated_by as draft_by,
           (select count(*)::int from attempts a where a.paper_id = c.code) as attempts
      from codes c
      left join exam_question_sets s on s.code = c.code
      left join exam_question_drafts d on d.code = c.code
     order by c.code
  `) as SetSummary[];
}

export interface Editor {
  items: DraftQuestion[];
  /** Where the items came from: the saved draft, the loaded set, or nothing yet. */
  source: "draft" | "loaded" | "new";
  /** The draft's updated_at, so two people saving over each other is caught. */
  version: Version | null;
  loaded_count: number | null;
  attempts: number;
}

export async function openEditor(paperId: string, code: string): Promise<Editor> {
  const [draft] = (await sql`
    select items, updated_at from exam_question_drafts where code = ${code}
  `) as { items: DraftQuestion[]; updated_at: Date }[];
  const [loaded] = (await sql`
    select questions, answer_key, question_count from exam_question_sets
     where code = ${code} and exam_paper_id = ${paperId}::bigint
  `) as { questions: { q: string; context?: string; section?: string; options: string[] }[]; answer_key: number[]; question_count: number }[];
  const [{ attempts }] = (await sql`
    select count(*)::int as attempts from attempts where paper_id = ${code}
  `) as { attempts: number }[];

  if (draft) {
    return {
      items: draft.items,
      source: "draft",
      version: new Date(draft.updated_at).toISOString(),
      loaded_count: loaded?.question_count ?? null,
      attempts,
    };
  }
  if (loaded) {
    return {
      items: loaded.questions.map((q, i) => ({ ...q, answer: loaded.answer_key[i] ?? null })),
      source: "loaded",
      version: null,
      loaded_count: loaded.question_count,
      attempts,
    };
  }
  return { items: [], source: "new", version: null, loaded_count: null, attempts };
}

type Result = { ok: true; version: Version } | { ok: false; message: string };

/** Shape-check what arrived from the browser. Content is checked separately. */
function sanitise(raw: unknown): DraftQuestion[] | null {
  if (!Array.isArray(raw) || raw.length > 500) return null;
  const out: DraftQuestion[] = [];
  for (const r of raw) {
    const it = r as Partial<DraftQuestion>;
    if (typeof it?.q !== "string" || !Array.isArray(it.options) || it.options.length > MAX_OPTIONS) return null;
    if (it.options.some((o) => typeof o !== "string")) return null;
    if (it.answer !== null && it.answer !== undefined && !Number.isInteger(it.answer)) return null;
    if (it.context !== undefined && typeof it.context !== "string") return null;
    if (it.section !== undefined && typeof it.section !== "string") return null;
    if (it.image !== undefined && !(typeof it.image === "string" && IMAGE_ID.test(it.image))) return null;
    if (it.optionImages !== undefined) {
      if (!Array.isArray(it.optionImages) || it.optionImages.length > MAX_OPTIONS) return null;
      if (it.optionImages.some((p) => p !== null && !(typeof p === "string" && IMAGE_ID.test(p)))) return null;
    }
    out.push(tidy({ ...it, q: it.q, options: it.options, answer: it.answer ?? null }));
  }
  return out;
}

async function guard(paperId: string, code: string): Promise<string | null> {
  const paper = await editablePaper(paperId);
  if (!paper) return "That paper cannot take questions here. Phase 1 and offline papers are closed to edits.";
  const parsed = parseSetCode(code);
  if (!parsed || parsed.paperCode !== paper.code) return "That is not a question set of this paper.";
  const [{ n }] = (await sql`select count(*)::int as n from attempts where paper_id = ${code}`) as { n: number }[];
  if (n > 0) return `${n} students have already sat this set. It cannot be changed: their marks depend on it.`;
  return null;
}

export async function saveDraft(
  paperId: string,
  code: string,
  raw: unknown,
  version: Version | null,
  staffId: string,
): Promise<Result> {
  const refused = await guard(paperId, code);
  if (refused) return { ok: false, message: refused };
  const items = sanitise(raw);
  if (!items) return { ok: false, message: "The questions did not arrive in a shape that can be saved. Reload the page." };

  // One statement, so "has somebody else saved since I opened this" and the
  // write cannot be separated by another save landing in between.
  const rows = (await sql`
    insert into exam_question_drafts (code, exam_paper_id, items, updated_by)
    values (${code}, ${paperId}::bigint, ${JSON.stringify(items)}::jsonb, ${staffId})
    on conflict (code) do update
       set items = excluded.items, updated_by = excluded.updated_by, updated_at = now()
     where ${version}::timestamptz is not null
       and date_trunc('milliseconds', exam_question_drafts.updated_at) = ${version}::timestamptz
    returning updated_at
  `) as { updated_at: Date }[];

  if (!rows.length) {
    const [other] = (await sql`
      select updated_by, updated_at from exam_question_drafts where code = ${code}
    `) as { updated_by: string; updated_at: Date }[];
    return {
      ok: false,
      message: other
        ? `${other.updated_by} saved this draft after you opened it. Copy anything you need, then reload to see theirs.`
        : "The draft changed while you were editing. Reload the page.",
    };
  }

  await logAdminEvent(staffId, "question_draft_saved", { kind: "question_set", id: code }, { count: items.length });
  return { ok: true, version: new Date(rows[0].updated_at).toISOString() };
}

/**
 * Check the draft and load it into the paper. The set a child is handed is the
 * one written here; the draft is cleared, because it is now the loaded set.
 */
export async function loadDraft(
  paperId: string,
  code: string,
  staffId: string,
): Promise<{ ok: true; count: number } | { ok: false; message: string; problems?: string[] }> {
  const refused = await guard(paperId, code);
  if (refused) return { ok: false, message: refused };
  const paper = (await editablePaper(paperId))!;
  const parsed = parseSetCode(code)!;

  const [draft] = (await sql`
    select items from exam_question_drafts where code = ${code}
  `) as { items: DraftQuestion[] }[];
  if (!draft) return { ok: false, message: "There is no saved draft to load. Save first." };

  const items = draft.items.map(tidy);
  const { problems } = checkQuestions(items, paper.question_count);
  const gone = await missingImages(imagesUsed(items));
  if (gone.length) problems.push(`${gone.length} picture${gone.length === 1 ? " is" : "s are"} missing from the store. Upload ${gone.length === 1 ? "it" : "them"} again.`);
  if (problems.length) return { ok: false, message: "Nothing was loaded. Fix these first:", problems };

  const questions = items.map(({ q, context, section, options, image, optionImages }) => ({
    ...(section ? { section } : {}),
    q,
    ...(context ? { context } : {}),
    options,
    ...(image ? { image } : {}),
    ...(optionImages ? { optionImages } : {}),
  }));
  const key = items.map((it) => it.answer as number);
  const checksum = createHash("sha256").update(JSON.stringify({ questions, key })).digest("hex");

  await sql.transaction([
    sql`
      insert into exam_question_sets
        (code, exam_paper_id, class, stream, medium, questions, answer_key, question_count, checksum, loaded_by)
      values
        (${code}, ${paperId}::bigint, ${parsed.cls}, ${parsed.stream}, ${parsed.medium},
         ${JSON.stringify(questions)}::jsonb, ${JSON.stringify(key)}::jsonb, ${questions.length},
         ${checksum}, ${staffId})
      on conflict (code) do update set
        questions = excluded.questions, answer_key = excluded.answer_key,
        question_count = excluded.question_count, checksum = excluded.checksum,
        loaded_at = now(), loaded_by = excluded.loaded_by, exam_paper_id = excluded.exam_paper_id
    `,
    sql`delete from exam_question_drafts where code = ${code}`,
  ]);

  await logAdminEvent(staffId, "question_set_loaded", { kind: "question_set", id: code }, {
    count: questions.length,
    pictures: imagesUsed(items).length,
    sha: checksum.slice(0, 16),
  });
  // This server at once; every other one within loadQuestionSets' minute.
  await loadQuestionSets(true);
  return { ok: true, count: questions.length };
}

export async function discardDraft(paperId: string, code: string, staffId: string): Promise<Result> {
  if (!(await editablePaper(paperId))) return { ok: false, message: "That paper cannot take questions here." };
  const gone = (await sql`
    delete from exam_question_drafts where code = ${code} and exam_paper_id = ${paperId}::bigint returning code
  `) as unknown[];
  if (!gone.length) return { ok: false, message: "There was no draft to throw away." };
  await logAdminEvent(staffId, "question_draft_discarded", { kind: "question_set", id: code });
  return { ok: true, version: "" };
}

/** Take a loaded set off a paper. Refused once anybody has sat it. */
export async function removeLoadedSet(paperId: string, code: string, staffId: string): Promise<Result> {
  const refused = await guard(paperId, code);
  if (refused) return { ok: false, message: refused };
  const gone = (await sql`
    delete from exam_question_sets where code = ${code} and exam_paper_id = ${paperId}::bigint returning code
  `) as unknown[];
  if (!gone.length) return { ok: false, message: "That set is not loaded." };
  await logAdminEvent(staffId, "question_set_removed", { kind: "question_set", id: code });
  await loadQuestionSets(true);
  return { ok: true, version: "" };
}

/* ------------------------------------------------------------------ Excel --- */

/**
 * The template's columns. Matched by heading, not position, so a sheet with a
 * column moved or an extra notes column still reads.
 */
export const SHEET_COLUMNS = ["Section", "Passage", "Question", "Image", "A", "B", "C", "D", "E", "F", "Answer"] as const;

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in v) return v.richText.map((r) => r.text).join("").trim();
  if (typeof v === "object" && "result" in v) return String(v.result ?? "").trim();
  if (typeof v === "object" && "text" in v) return String(v.text ?? "").trim();
  return String(cell.text ?? v).trim();
}

/**
 * Read a question sheet. Returns every row it could read and a sentence for
 * every row it could not -- the office fixes the sheet, or the question in the
 * editor, rather than losing the other forty-nine to one bad row.
 */
export async function readQuestionSheet(
  data: ArrayBuffer,
  staffId: string,
): Promise<{ items: DraftQuestion[]; problems: string[] }> {
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(data);
  } catch {
    return { items: [], problems: ["That file is not an Excel workbook (.xlsx). Save it as .xlsx and try again."] };
  }

  // The first sheet that has a "Question" heading -- so the template's
  // instructions sheet, wherever it sits, is skipped.
  for (const sheet of book.worksheets) {
    // The template's examples are a sheet of their own; they are never a paper.
    if (sheet.name.trim().toLowerCase() === "examples") continue;
    let headerRow = 0;
    const col = new Map<string, number>();
    for (let r = 1; r <= Math.min(sheet.rowCount, 10) && !headerRow; r++) {
      const row = sheet.getRow(r);
      row.eachCell((cell, c) => {
        const h = cellText(cell).toUpperCase().replace(/^OPTION\s+/, "");
        if (h === "QUESTION") headerRow = r;
        if (h) col.set(h, c);
      });
      if (!headerRow) col.clear();
    }
    if (!headerRow) continue;

    const items: DraftQuestion[] = [];
    const problems: string[] = [];
    const get = (row: ExcelJS.Row, h: string) => (col.has(h) ? cellText(row.getCell(col.get(h)!)) : "");

    /*
     * Pictures placed on the sheet. Each belongs to the row its top-left corner
     * sits in: over an option's column it is that option's picture, anywhere
     * else in the row it is the question's diagram. (Excel's newer "Place in
     * Cell" pictures are stored another way and are not seen -- the template
     * says to use "Place over Cells".)
     */
    const optionCol = new Map([...LETTERS].map((l, k) => [col.get(l), k] as const).filter(([c]) => c !== undefined));
    const pics = new Map<number, { question: ExcelJS.Image[]; options: Map<number, ExcelJS.Image> }>();
    for (const im of sheet.getImages()) {
      const r = Math.floor(im.range.tl.nativeRow) + 1;
      const c = Math.floor(im.range.tl.nativeCol) + 1;
      const image = book.getImage(Number(im.imageId));
      if (!image) continue;
      const slot = pics.get(r) ?? { question: [] as ExcelJS.Image[], options: new Map<number, ExcelJS.Image>() };
      const k = optionCol.get(c);
      if (k !== undefined && !slot.options.has(k)) slot.options.set(k, image);
      else slot.question.push(image);
      pics.set(r, slot);
    }
    const lastRow = Math.max(sheet.rowCount, ...pics.keys());
    const save = async (r: number, image: ExcelJS.Image): Promise<string | null> => {
      const bytes = image.buffer ?? (image.base64 ? Buffer.from(image.base64.replace(/^data:[^,]*,/, ""), "base64") : null);
      if (!bytes) return null;
      const stored = await storeImage(new Uint8Array(bytes), staffId);
      if (!stored.ok) {
        problems.push(`Row ${r}: a picture could not be used — ${stored.message}`);
        return null;
      }
      return stored.id;
    };

    for (let r = headerRow + 1; r <= lastRow; r++) {
      const row = sheet.getRow(r);
      const q = get(row, "QUESTION");
      const options = [...LETTERS].map((l) => get(row, l));
      const rowPics = pics.get(r);
      if (!q && options.every((o) => !o) && !rowPics) continue; // a blank row

      if (rowPics && rowPics.question.length > 1) {
        problems.push(`Row ${r}: ${rowPics.question.length} pictures for one question; only the first is used.`);
      }
      const image = rowPics?.question[0] ? await save(r, rowPics.question[0]) : null;
      const optionImages = await Promise.all(
        options.map((_, k) => (rowPics?.options.get(k) ? save(r, rowPics.options.get(k)!) : Promise.resolve(null))),
      );

      // Options are A, B, C… in order; a gap ("A, B, , D") is a mistake, not three options.
      const last = options.reduce((acc, o, i) => (o || optionImages[i] ? i : acc), -1);
      const used = options.slice(0, last + 1);

      const a = get(row, "ANSWER").toUpperCase().replace(/^OPTION\s+/, "").trim();
      let answer: number | null = null;
      if (/^[A-F]$/.test(a)) answer = LETTERS.indexOf(a);
      else if (/^[1-6]$/.test(a)) answer = Number(a) - 1;
      if (a && (answer === null || answer >= used.length)) {
        problems.push(`Row ${r}: the answer "${a}" is not one of its options.`);
        answer = null;
      } else if (!a) {
        problems.push(`Row ${r}: no answer given.`);
      }

      items.push(
        tidy({
          section: get(row, "SECTION"),
          context: get(row, "PASSAGE"),
          q,
          options: used,
          answer,
          ...(image ? { image } : {}),
          optionImages: optionImages.slice(0, last + 1),
        }),
      );
    }
    if (!items.length) problems.push("The sheet has headings but no questions under them.");
    return { items, problems };
  }

  return {
    items: [],
    problems: [
      `No sheet has a "Question" heading. Download the template and use its columns: ${SHEET_COLUMNS.join(", ")}.`,
    ],
  };
}
