import { randomBytes } from "node:crypto";
import { sql } from "@/lib/exam/db";
import { IMAGE_ID } from "@/lib/exam/question";

/**
 * Question diagrams: stored, checked, and released only when their paper opens.
 * See exam_question_images in src/lib/admin/schema.sql.
 */

/** Large enough for a scanned diagram; the editor shrinks anything bigger first. */
export const MAX_IMAGE_BYTES = 2_000_000;

/**
 * What the bytes actually are. The browser's own label is not trusted: a file
 * named diagram.png that is really an HTML page must never be served as one.
 * SVG is refused outright -- it can carry script.
 */
export function sniffImage(b: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | "image/gif" | null {
  const at = (i: number, ...xs: number[]) => xs.every((x, k) => b[i + k] === x);
  if (b.length < 12) return null;
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
}

export async function storeImage(
  bytes: Uint8Array,
  staffId: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (bytes.length === 0) return { ok: false, message: "That file is empty." };
  if (bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false, message: `That picture is ${(bytes.length / 1e6).toFixed(1)} MB; the most is 2 MB.` };
  }
  const mime = sniffImage(bytes);
  if (!mime) return { ok: false, message: "That is not a PNG, JPEG, WebP or GIF picture." };

  const id = randomBytes(16).toString("hex");
  await sql`
    insert into exam_question_images (id, mime, bytes, size, uploaded_by)
    values (${id}, ${mime}, decode(${Buffer.from(bytes).toString("hex")}, 'hex'), ${bytes.length}, ${staffId})
  `;
  return { ok: true, id };
}

export async function readImage(id: string): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!IMAGE_ID.test(id)) return null;
  const [row] = (await sql`
    select mime, encode(bytes, 'base64') as b64 from exam_question_images where id = ${id}
  `) as { mime: string; b64: string }[];
  return row ? { mime: row.mime, bytes: Buffer.from(row.b64, "base64") } : null;
}

/**
 * May a student see this image yet? Only once a loaded set that uses it belongs
 * to a paper that has STARTED -- the moment /api/app/exam/start first hands out
 * the questions. Not when check-in opens: a hall full of children scanning in
 * half an hour early must not be able to study the diagrams. A diagram in a
 * draft, or in a paper still to start, is the paper itself.
 */
export async function imageIsReleased(id: string): Promise<boolean> {
  if (!IMAGE_ID.test(id)) return false;
  const rows = (await sql`
    select 1
      from exam_question_sets s
      join exam_papers p on p.id = s.exam_paper_id
     where p.archived_at is null
       and p.starts_at is not null and p.starts_at <= now()
       and s.questions::text like ${`%"${id}"%`}
     limit 1
  `) as unknown[];
  return rows.length > 0;
}

/** Of these ids, the ones that do not exist -- a set must not load pointing at nothing. */
export async function missingImages(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const rows = (await sql`
    select id from exam_question_images where id = any(${ids}::text[])
  `) as { id: string }[];
  const have = new Set(rows.map((r) => r.id));
  return ids.filter((i) => !have.has(i));
}
