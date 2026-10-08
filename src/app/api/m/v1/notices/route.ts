import { NextRequest } from "next/server";
import { json, mobileStudent } from "@/lib/app/mobile-api";
import { markNoticesRead, noticesFor } from "@/lib/app/notices";
import { fileHref } from "@/lib/app/file-links";
import { showsInline } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Notices, for the native app (board 07, 3C) — the website's list, as data.
 *
 * GET               → { notices: [...] }, newest first, read ones kept
 * POST { read: [] } → marks those keys read; only this student's own keys count
 *
 * A notice's way in is named by screen (`to`), not by web address. Files carry
 * a signed link of their own (src/lib/app/file-links.ts), so the phone's
 * viewer can open one without the session.
 */
const SCREEN: Record<string, "record" | "exam" | "set"> = {
  "/app/record": "record",
  "/app/exam": "exam",
  "/app/set": "set",
};

export async function GET(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const origin = new URL(request.url).origin;
  const notices = (await noticesFor(student)).map((n) => ({
    key: n.key,
    kind: n.kind,
    title: n.title,
    body: n.body,
    when: n.when,
    read: n.read,
    action: n.action && SCREEN[n.action.href] ? { label: n.action.label, to: SCREEN[n.action.href] } : null,
    files: (n.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      bytes: f.bytes,
      photo: showsInline(f.mime),
      url: `${origin}${fileHref(f.id, student.uid)}`,
    })),
  }));
  return json({ ok: true, notices });
}

export async function POST(request: NextRequest) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const body = await request.json().catch(() => ({}));
  const keys: string[] = Array.isArray(body?.read) ? body.read.map(String).filter(Boolean) : [];
  if (keys.length) {
    const mine = new Set((await noticesFor(student)).map((n) => n.key));
    await markNoticesRead(student.uid, keys.filter((k) => mine.has(k)));
  }
  return json({ ok: true });
}
