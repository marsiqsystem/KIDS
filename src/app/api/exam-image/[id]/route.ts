import { currentStaff } from "@/lib/admin/session";
import { imageIsReleased, readImage } from "@/lib/admin/question-images";
import { IMAGE_ID } from "@/lib/exam/question";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A question's diagram.
 *
 * Two readers, two rules:
 *
 *   an admin (the editor's preview)  -- any image, any time, never cached;
 *   anybody else                     -- only once a paper using it has started,
 *                                       and then cached for a year, by the phone
 *                                       and by the CDN.
 *
 * The second is not behind the student's session on purpose. On exam morning
 * every phone in every hall asks for the same pictures within a minute of each
 * other; a response the CDN may keep is served once from the database and then
 * from the edge. It gives nothing away: by then the paper is open, and the id
 * is random and appears nowhere but in the paper itself. Before that moment
 * this answers 404 to everybody but the office, and says so to no cache.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nothing = () => new Response("Not found.", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!IMAGE_ID.test(id)) return nothing();

  const staff = await currentStaff();
  const office = staff?.role === "admin" && !staff.must_change;
  if (!office && !(await imageIsReleased(id))) return nothing();

  const image = await readImage(id);
  if (!image) return nothing();

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(image.bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": office ? "private, no-store" : "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
