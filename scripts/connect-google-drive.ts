/**
 * Connect the KIDS Google Drive — once.
 *
 *   node --env-file=.env.local scripts/connect-google-drive.ts
 *   node --env-file=.env.local scripts/connect-google-drive.ts --check
 *
 * Teachers' notes and photos are saved into a Google Drive folder, the way the
 * MARS bot saved what it was sent when it ran in n8n (src/lib/drive.ts). This
 * script does the part n8n's "Sign in with Google" button did: it asks Google
 * for the office account's consent and keeps the long-lived token.
 *
 * Before running it
 * -----------------
 * In Google Cloud console (any project — the MARS one will do):
 *
 *   1. APIs & Services → Library → enable "Google Drive API".
 *   2. OAuth consent screen → User type External → add the scope
 *      `.../auth/drive.file` → PUBLISH APP so it says "In production".
 *      ⚠️ Left in "Testing", Google kills the token after seven days and
 *      uploads stop a week later with "invalid_grant".
 *   3. Credentials → Create credentials → OAuth client ID → type "Desktop app".
 *   4. Put its two values in .env.local:
 *        GOOGLE_DRIVE_CLIENT_ID=…
 *        GOOGLE_DRIVE_CLIENT_SECRET=…
 *
 * Then run this, open the link it prints, sign in with the Google account
 * whose Drive should hold the files, and allow. It:
 *
 *   - writes GOOGLE_DRIVE_REFRESH_TOKEN into .env.local,
 *   - creates a folder "KIDS app uploads" in that My Drive (unless
 *     GOOGLE_DRIVE_FOLDER_ID is already set) and writes its id too,
 *   - creates "KIDS class recordings" beside it for the live-class recorder
 *     and writes GOOGLE_DRIVE_RECORDINGS_FOLDER_ID,
 *   - prints the names to add to Vercel.
 *
 * `--check` also makes the recordings folder if an earlier run predates it.
 *
 * Google shows "Google hasn't verified this app" for a new client. That is
 * the office's own client asking for its own Drive: Advanced → Go to … (unsafe)
 * is the right answer here and nowhere else.
 *
 * `--check` uses what is in .env.local to fetch a token and read the folder,
 * and prints nothing secret. Run it whenever uploads start failing.
 */

import { appendFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const ENV_FILE = new URL("../.env.local", import.meta.url);

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET are not in .env.local.\n" +
      "Make a Desktop-app OAuth client first — the steps are at the top of this file.",
  );
  process.exit(1);
}

async function token(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId!, client_secret: clientSecret!, ...body }),
  });
  if (!res.ok) throw new Error(`Google refused: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string; refresh_token?: string; scope: string };
}

/** A folder in the connected My Drive, made by this app (drive.file can see it). */
async function makeFolder(accessToken: string, name: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!res.ok) throw new Error(`Could not make "${name}": ${res.status} ${await res.text()}`);
  const id = ((await res.json()) as { id: string }).id;
  console.log(`  Made the folder "${name}" in that account's My Drive.`);
  return id;
}

/** The live-class recorder's own folder, so hours of video do not bury the notes. */
async function ensureRecordingsFolder(accessToken: string) {
  if (process.env.GOOGLE_DRIVE_RECORDINGS_FOLDER_ID) return;
  writeEnv(
    "GOOGLE_DRIVE_RECORDINGS_FOLDER_ID",
    await makeFolder(accessToken, "KIDS class recordings"),
  );
  console.log("  Add GOOGLE_DRIVE_RECORDINGS_FOLDER_ID to Vercel too.");
}

async function check() {
  const refresh = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const folder = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!refresh || !folder) {
    console.error("Not connected: GOOGLE_DRIVE_REFRESH_TOKEN or GOOGLE_DRIVE_FOLDER_ID is missing.");
    process.exit(1);
  }

  const { access_token } = await token({ refresh_token: refresh, grant_type: "refresh_token" });
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folder}?fields=name,trashed`,
    { headers: { authorization: `Bearer ${access_token}` } },
  );
  if (!res.ok) {
    console.error(`The token works but the folder answered ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const f = (await res.json()) as { name: string; trashed?: boolean };
  console.log(`Connected. Uploads go to "${f.name}"${f.trashed ? " — ⚠️ WHICH IS IN THE BIN" : ""}.`);

  const rec = process.env.GOOGLE_DRIVE_RECORDINGS_FOLDER_ID;
  if (!rec) {
    await ensureRecordingsFolder(access_token);
    return;
  }
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${rec}?fields=name,trashed`, {
    headers: { authorization: `Bearer ${access_token}` },
  });
  const rf = r.ok ? ((await r.json()) as { name: string; trashed?: boolean }) : null;
  console.log(
    rf
      ? `Recordings go to "${rf.name}"${rf.trashed ? " — ⚠️ WHICH IS IN THE BIN" : ""}.`
      : `⚠️ The recordings folder answered ${r.status}.`,
  );
}

function envHas(name: string): boolean {
  try {
    return new RegExp(`^${name}=.+`, "m").test(readFileSync(ENV_FILE, "utf8"));
  } catch {
    return false;
  }
}

function writeEnv(name: string, value: string) {
  if (envHas(name)) {
    console.log(`  ${name} is already in .env.local — not overwritten. Replace it by hand:`);
    console.log(`  ${name}=${value}`);
    return;
  }
  appendFileSync(ENV_FILE, `\n${name}=${value}\n`);
  console.log(`  ${name} written to .env.local`);
}

async function connect() {
  const state = randomBytes(16).toString("hex");

  // Desktop-app clients may redirect to any port on the loopback address, so
  // nothing has to be registered in the console for this.
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const redirect = `http://127.0.0.1:${port}/`;

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId!,
      redirect_uri: redirect,
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent", // without it Google sends no refresh token on a second run
      state,
    });

  console.log("\nOpen this link, sign in with the KIDS Google account, and allow:\n");
  console.log(url);
  console.log("\nWaiting…");

  const code = await new Promise<string>((resolve, reject) => {
    server.on("request", (req, res) => {
      const params = new URL(req.url ?? "/", redirect).searchParams;
      if (!params.has("code") && !params.has("error")) {
        res.writeHead(404).end();
        return;
      }
      const ok = params.get("state") === state && params.get("code");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(
        ok
          ? "<p style='font:16px sans-serif'>Done. You can close this tab and go back to the terminal.</p>"
          : "<p style='font:16px sans-serif'>That did not work — look at the terminal.</p>",
      );
      server.close();
      if (ok) resolve(params.get("code")!);
      else reject(new Error(params.get("error") ?? "The answer did not match this request."));
    });
  });

  const tokens = await token({ code, redirect_uri: redirect, grant_type: "authorization_code" });
  if (!tokens.refresh_token) throw new Error("Google sent no refresh token. Run this again.");
  if (!tokens.scope.split(" ").includes(SCOPE)) {
    throw new Error("Drive access was not granted — tick the Drive box on Google's screen.");
  }

  console.log("\nConnected.");
  writeEnv("GOOGLE_DRIVE_REFRESH_TOKEN", tokens.refresh_token);

  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
    writeEnv("GOOGLE_DRIVE_FOLDER_ID", await makeFolder(tokens.access_token, "KIDS app uploads"));
  }
  await ensureRecordingsFolder(tokens.access_token);

  console.log(
    "\nNow add the same to Vercel (Production), then redeploy:\n" +
      "  GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN,\n" +
      "  GOOGLE_DRIVE_FOLDER_ID, GOOGLE_DRIVE_RECORDINGS_FOLDER_ID\n" +
      "Copy the values from .env.local. Never commit them.",
  );
}

if (process.argv.includes("--check")) await check();
else await connect();
