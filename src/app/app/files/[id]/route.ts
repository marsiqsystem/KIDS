import { currentStaff } from "@/lib/admin/session";
import { fileForStaff, fileForStudent } from "@/lib/admin/posts";
import { uidFromFileToken } from "@/lib/app/file-links";
import { requireStudent } from "@/lib/app/gate";
import { download, driveConfigured } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One file attached to a post — a teacher's notes, a photo of the board.
 *
 * The file is in the office's Google Drive and is shared with nobody. This
 * route is the only way to it, and it asks who is looking first:
 *
 *   - somebody signed in to the console sees what listPosts would show them;
 *   - otherwise it is a student, through the same gate as every app screen
 *     (signed out goes to sign-in, the wrong phone is turned away), and they
 *     see it only while they could see the post itself.
 *
 * The bytes are streamed through, not buffered, so a 20 MB scan does not have
 * to fit in the function's memory before the first page reaches the phone.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!driveConfigured()) return new Response("Files are not available yet.", { status: 503 });

  // A signed link first: it is how the phone's own PDF viewer, which has no
  // cookie, gets the file the app handed it (src/lib/app/file-links.ts).
  const tokenUid = uidFromFileToken(id, new URL(request.url).searchParams.get("t"));
  const staff = tokenUid ? null : await currentStaff();
  const file = tokenUid
    ? await fileForStudent(id, tokenUid)
    : staff
      ? await fileForStaff(id, staff.staff_id, staff.role === "admin")
      : await fileForStudent(id, (await requireStudent()).uid);

  if (!file) return new Response("That file is not there, or is no longer shared.", { status: 404 });

  const upstream = await download(file.drive_id, request.headers.get("range"));
  if (!upstream.ok || !upstream.body) {
    console.error(`Drive: file ${file.id} (${file.drive_id}) answered ${upstream.status}.`);
    return new Response("The file could not be fetched just now. Try again.", { status: 502 });
  }

  const out = new Headers({
    "content-type": file.mime,
    // inline: a photo or PDF opens on the phone rather than vanishing into
    // Downloads. The name is kept so a saved copy is called what the teacher
    // called it.
    "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    // Private: never kept by anything between Vercel and the phone.
    "cache-control": "private, max-age=3600",
    "x-content-type-options": "nosniff",
  });
  for (const h of ["content-length", "content-range", "accept-ranges"]) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
