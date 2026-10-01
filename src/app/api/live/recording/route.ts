import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { openRecordingUpload, recordingUploaded } from "@/lib/admin/recordings";
import { driveConfigured } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where the class server hands over a recording. Two calls, both from
 * scripts/live/kids-finalize.sh on the Jitsi box after Jibri stops:
 *
 *   {"action":"start","room":"kids-…","bytes":123}  → {"url": <Drive upload address>}
 *   {"action":"done","driveId":"…"}                 → {"classId": "…"}
 *
 * Signed, because this route can put a video on 65 phones. The server signs
 * `<unix seconds>.<raw body>` with KIDS_JITSI_SECRET — the secret it already
 * shares with this app for join tokens, so nothing new lives on that machine,
 * and above all not the Google Drive token. A signature older than ten minutes
 * is refused, so a captured request cannot be replayed next week.
 */
const SKEW_SECONDS = 600;

function signedBy(secret: string, stamp: string, body: string, given: string): boolean {
  const expected = Buffer.from(createHmac("sha256", secret).update(`${stamp}.${body}`).digest("hex"));
  const got = Buffer.from(given);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export async function POST(request: Request) {
  const secret = process.env.KIDS_JITSI_SECRET;
  if (!secret || !driveConfigured()) {
    return NextResponse.json({ error: "Recording is not configured on the app." }, { status: 503 });
  }

  const body = await request.text();
  const stamp = request.headers.get("x-kids-timestamp") ?? "";
  const signature = request.headers.get("x-kids-signature") ?? "";

  if (!/^\d{10}$/.test(stamp) || Math.abs(Date.now() / 1000 - Number(stamp)) > SKEW_SECONDS) {
    return NextResponse.json({ error: "Stale or missing timestamp." }, { status: 401 });
  }
  if (!signedBy(secret, stamp, body, signature)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  let input: { action?: string; room?: string; bytes?: number; driveId?: string };
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Not JSON." }, { status: 400 });
  }

  try {
    if (input.action === "start") {
      const bytes = Number(input.bytes);
      if (!input.room || !Number.isFinite(bytes) || bytes <= 0) {
        return NextResponse.json({ error: "Need room and bytes." }, { status: 400 });
      }
      const opened = await openRecordingUpload({ room: input.room, bytes });
      if (!opened) {
        // Not an error the script should retry: a room with no class is a
        // rehearsal, a stray, or somebody else's. Keep the file, say so.
        return NextResponse.json({ error: `No class has room ${input.room}.` }, { status: 404 });
      }
      return NextResponse.json({ url: opened.url, classId: opened.classId });
    }

    if (input.action === "done") {
      if (!input.driveId || !/^[\w-]{10,200}$/.test(input.driveId)) {
        return NextResponse.json({ error: "Need driveId." }, { status: 400 });
      }
      const result = await recordingUploaded(input.driveId);
      if (!result.ok) return NextResponse.json({ error: result.why }, { status: 422 });
      return NextResponse.json({ classId: result.classId, already: result.already });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("Recording handover failed.", err);
    return NextResponse.json({ error: "The app could not reach Google Drive. Retry." }, { status: 502 });
  }
}
