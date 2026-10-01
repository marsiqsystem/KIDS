/**
 * The KIDS Google Drive — where teachers' notes and photos are kept.
 *
 * The same arrangement the MARS bot used in n8n: one Google account (the
 * office's own), connected once through OAuth, and every file saved into a
 * folder in that account's My Drive. Nothing is stored in Neon but a row saying
 * which Drive file belongs to which post.
 *
 * Three settings, all made by `scripts/connect-google-drive.ts`:
 *
 *   GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET — the OAuth client.
 *   GOOGLE_DRIVE_REFRESH_TOKEN — the office account's consent, long-lived.
 *   GOOGLE_DRIVE_FOLDER_ID     — the folder the uploads go into.
 *
 * The scope is `drive.file`: this app can see only the files it created itself,
 * not the rest of the account's Drive. That is also what keeps Google from
 * demanding an app review.
 *
 * ⚠️ The OAuth consent screen must be set to "In production". While it says
 * "Testing", Google expires the refresh token after seven days and every upload
 * starts failing a week after it was set up.
 *
 * Files are never shared publicly. A student reaches one through
 * /app/files/<id>, which checks they may see the post, and the bytes are
 * streamed from here.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/** Largest file a teacher may attach. A phone photo is 3–8 MB; a scanned chapter can be 20. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES_PER_POST = 6;

/**
 * What may be attached. Photos, PDFs and the office formats a teacher writes
 * notes in. Nothing executable, nothing a phone cannot open.
 */
export const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "Photo",
  "image/png": "Picture",
  "image/webp": "Picture",
  "image/heic": "Photo",
  "image/heif": "Photo",
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-powerpoint": "Slides",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "Slides",
  "application/vnd.ms-excel": "Sheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Sheet",
  "text/plain": "Text",
};

/** The pictures a phone's WebView draws inline. HEIC is a photo but Android cannot show it. */
export function showsInline(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

export function driveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN &&
      process.env.GOOGLE_DRIVE_FOLDER_ID,
  );
}

function folderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error("Google Drive is not connected (GOOGLE_DRIVE_FOLDER_ID is unset).");
  return id;
}

/**
 * An access token, refreshed when it is within a minute of expiring.
 *
 * Kept in module memory: a warm serverless instance reuses it for its hour, a
 * cold one asks Google once. Nothing is written anywhere.
 */
let cached: { token: string; until: number } | null = null;

export async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;

  const { GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN } =
    process.env;
  if (!GOOGLE_DRIVE_CLIENT_ID || !GOOGLE_DRIVE_CLIENT_SECRET || !GOOGLE_DRIVE_REFRESH_TOKEN) {
    throw new Error("Google Drive is not connected. Run scripts/connect-google-drive.ts.");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_DRIVE_CLIENT_ID,
      client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
      refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    // invalid_grant almost always means the consent screen was left in Testing
    // and the token aged out, or somebody removed the app from the account.
    throw new Error(`Google Drive refused the refresh token: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, until: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/**
 * Open an upload that the teacher's browser finishes by itself.
 *
 * The file does not pass through this server. Vercel refuses request bodies
 * over 4.5 MB, and a phone photo of a page of notes is often larger, so the
 * server only asks Google for a one-off upload address and the browser sends
 * the bytes straight there. The address is good for that one file and nothing
 * else; it carries no token.
 *
 * `origin` must be the page's own origin. Google answers the browser's upload
 * with CORS headers only for the origin named when the session was opened.
 *
 * The staff id is written into the file's appProperties so that the post which
 * later claims it can be checked against the person who uploaded it.
 */
export async function openUpload(input: {
  name: string;
  mime: string;
  bytes: number;
  /** Who uploaded it — a staff id, or "jibri" for a class recording. */
  staffId: string;
  /** The page's origin, for a browser upload. Omitted when a server does the PUT. */
  origin?: string;
  /** Defaults to the uploads folder; recordings go to their own. */
  folder?: string;
  /** Extra appProperties, e.g. which class a recording belongs to. */
  props?: Record<string, string>;
}): Promise<string> {
  const token = await accessToken();
  const res = await fetch(`${UPLOAD}/files?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": input.mime,
      "x-upload-content-length": String(input.bytes),
      ...(input.origin ? { origin: input.origin } : {}),
    },
    body: JSON.stringify({
      name: input.name,
      mimeType: input.mime,
      parents: [input.folder ?? folderId()],
      appProperties: { kids: "post", ...input.props, by: input.staffId },
    }),
    cache: "no-store",
  });

  const location = res.headers.get("location");
  if (!res.ok || !location) {
    throw new Error(`Google Drive would not open an upload: ${res.status} ${await res.text()}`);
  }
  return location;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  parents: string[];
  by: string | null;
  props: Record<string, string>;
}

/** What Drive says about one file, or null if this app cannot see it. */
export async function fileInfo(id: string): Promise<DriveFile | null> {
  if (!/^[\w-]{10,200}$/.test(id)) return null;

  const token = await accessToken();
  const res = await fetch(
    `${API}/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size,parents,appProperties,trashed`,
    { headers: { authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Google Drive: ${res.status} ${await res.text()}`);

  const f = (await res.json()) as {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    parents?: string[];
    appProperties?: Record<string, string>;
    trashed?: boolean;
  };
  if (f.trashed) return null;

  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: Number(f.size ?? 0),
    parents: f.parents ?? [],
    by: f.appProperties?.by ?? null,
    props: f.appProperties ?? {},
  };
}

/**
 * The folder class recordings go into. Its own, so 40 hours of video do not
 * bury the teachers' notes. Falls back to the uploads folder if it was never
 * made (scripts/connect-google-drive.ts makes it).
 */
export function recordingsFolderId(): string {
  return process.env.GOOGLE_DRIVE_RECORDINGS_FOLDER_ID || folderId();
}

/**
 * Make one file playable by anybody holding its link, and nothing more.
 *
 * Umar's ruling, 2 Oct 2026, for class recordings ONLY: a 90-minute video is
 * 1-1.5 GB, and 65 students watching it through Vercel would be ~80 GB a class,
 * so the video is played by Google's own player from Drive instead. That
 * player needs the file readable without a Google sign-in. The cost, accepted:
 * a link dug out of the app and forwarded plays for whoever has it, until the
 * file is unshared. Download, print and copy are switched off for viewers.
 *
 * Never used for post attachments, which stay private behind /app/files.
 */
export async function shareForViewing(id: string): Promise<void> {
  const token = await accessToken();
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };

  const perm = await fetch(`${API}/files/${encodeURIComponent(id)}/permissions?fields=id`, {
    method: "POST",
    headers,
    body: JSON.stringify({ role: "reader", type: "anyone", allowFileDiscovery: false }),
    cache: "no-store",
  });
  if (!perm.ok) throw new Error(`Drive would not share ${id}: ${perm.status} ${await perm.text()}`);

  const lock = await fetch(`${API}/files/${encodeURIComponent(id)}?fields=id`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ copyRequiresWriterPermission: true }),
    cache: "no-store",
  });
  if (!lock.ok) throw new Error(`Drive would not lock ${id}: ${lock.status} ${await lock.text()}`);
}

/** Undo shareForViewing: the link stops working for everybody, at once. */
export async function unshare(id: string): Promise<void> {
  const token = await accessToken();
  const res = await fetch(
    `${API}/files/${encodeURIComponent(id)}/permissions?fields=permissions(id,type)`,
    { headers: { authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Drive: ${res.status} ${await res.text()}`);
  const { permissions = [] } = (await res.json()) as { permissions?: { id: string; type: string }[] };

  for (const p of permissions.filter((p) => p.type === "anyone")) {
    const del = await fetch(`${API}/files/${encodeURIComponent(id)}/permissions/${p.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!del.ok && del.status !== 404) {
      throw new Error(`Drive would not unshare ${id}: ${del.status} ${await del.text()}`);
    }
  }
}

/** Google's own player for a shared file, for an iframe. */
export function drivePlayerUrl(id: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
}

/** True when the file sits in the KIDS uploads folder. */
export function inUploadsFolder(f: DriveFile): boolean {
  return f.parents.includes(folderId());
}

/**
 * The file's bytes, as Google sends them, for streaming on to the student.
 *
 * Passes a Range header through so a long PDF or a video can be read a piece
 * at a time instead of downloaded whole before the first page shows.
 */
export async function download(id: string, range?: string | null): Promise<Response> {
  const token = await accessToken();
  return fetch(`${API}/files/${encodeURIComponent(id)}?alt=media`, {
    headers: {
      authorization: `Bearer ${token}`,
      ...(range ? { range } : {}),
    },
    cache: "no-store",
  });
}
