import { connect } from "node:http2";
import { createPrivateKey, sign } from "node:crypto";
import type { PushMessage } from "@/lib/app/push";

/**
 * iPhone push — straight to Apple (APNs), because an iPhone's push token is
 * Apple's, not Firebase's. Android goes through Firebase (src/lib/app/push.ts).
 *
 * Inert until configured, like Firebase. It needs, from the Apple Developer
 * account of IQ Systems and Research Pvt. Ltd. (Certificates, Identifiers &
 * Profiles → Keys → a key with "Apple Push Notifications service"):
 *
 *   KIDS_APNS_KEY      the .p8 file's contents (newlines may be written as \n)
 *   KIDS_APNS_KEY_ID   the key's 10-character id
 *   KIDS_APNS_TEAM_ID  the team id
 *   KIDS_APNS_SANDBOX  "1" only for development builds; store builds use production
 *
 * Tokens are stored on app_devices with an `apns:` prefix, so the Firebase
 * sender never sees them and this one never sees Firebase's.
 */
const BUNDLE_ID = "org.kidskolkata.set";
export const APNS_PREFIX = "apns:";

function config() {
  const key = process.env.KIDS_APNS_KEY?.replace(/\\n/g, "\n").trim();
  const keyId = process.env.KIDS_APNS_KEY_ID?.trim();
  const teamId = process.env.KIDS_APNS_TEAM_ID?.trim();
  if (!key || !keyId || !teamId) return null;
  return { key, keyId, teamId, host: process.env.KIDS_APNS_SANDBOX === "1" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com" };
}

export function apnsConfigured(): boolean {
  return config() !== null;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

// Apple wants the provider token refreshed at most every 20 minutes and no
// older than an hour; 40 minutes sits between.
let cached: { token: string; at: number } | null = null;

function providerToken(c: NonNullable<ReturnType<typeof config>>): string {
  if (cached && Date.now() - cached.at < 40 * 60_000) return cached.token;
  const head = b64url(JSON.stringify({ alg: "ES256", kid: c.keyId }));
  const claims = b64url(JSON.stringify({ iss: c.teamId, iat: Math.floor(Date.now() / 1000) }));
  const signature = sign("sha256", Buffer.from(`${head}.${claims}`), {
    key: createPrivateKey(c.key),
    dsaEncoding: "ieee-p1363",
  });
  cached = { token: `${head}.${claims}.${b64url(signature)}`, at: Date.now() };
  return cached.token;
}

export type ApnsResult = "sent" | "dead" | "failed";

/**
 * Send one message to several iPhones over one HTTP/2 connection (APNs speaks
 * nothing else). "dead" is Apple saying the token is gone — the app was
 * removed, or the token replaced — and the caller retires it.
 */
export async function sendApns(tokens: string[], message: PushMessage): Promise<ApnsResult[]> {
  const c = config();
  if (!c || tokens.length === 0) return tokens.map(() => "failed");

  const bearer = providerToken(c);
  const body = JSON.stringify({
    aps: { alert: { title: message.title, body: message.body }, sound: "default" },
    // Read by the app when the notification is tapped (src/lib/push.ts in mobile/).
    path: message.path,
  });

  const session = connect(c.host);
  session.on("error", () => {});
  try {
    return await Promise.all(
      tokens.map(
        (token) =>
          new Promise<ApnsResult>((resolve) => {
            const req = session.request({
              ":method": "POST",
              ":path": `/3/device/${token}`,
              authorization: `bearer ${bearer}`,
              "apns-topic": BUNDLE_ID,
              "apns-push-type": "alert",
              "apns-priority": "10",
              "content-type": "application/json",
            });
            let status = 0;
            let text = "";
            req.on("response", (h) => (status = Number(h[":status"])));
            req.on("data", (d) => (text += d));
            req.on("end", () => {
              if (status === 200) return resolve("sent");
              if (status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(text)) return resolve("dead");
              console.error(`Push: APNs returned ${status}.`, text);
              resolve("failed");
            });
            req.on("error", () => resolve("failed"));
            req.setTimeout(10_000, () => {
              req.close();
              resolve("failed");
            });
            req.end(body);
          }),
      ),
    );
  } finally {
    session.close();
  }
}
