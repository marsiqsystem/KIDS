import Constants from "expo-constants";
import { rememberServerNow } from "./clock";

/**
 * The KIDS server's mobile API (src/app/api/m/v1 in the website's repo).
 *
 * Production by default. For testing against a laptop, start the app with
 * EXPO_PUBLIC_API_URL=http://<laptop-ip>:3000 — the phone cannot reach
 * "localhost", which is the phone itself.
 */
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "https://www.kidskolkata.org";

/** Thrown when the server says this session is no longer good. */
export class SignedOut extends Error {
  constructor(public reason: "signed_out" | "moved") {
    super(reason);
  }
}

/**
 * One call to the API. The session token, when there is one, goes in the
 * Authorization header — the server reads it exactly as it reads the
 * website's cookie (src/lib/app/session.ts).
 */
export async function api<T>(
  path: string,
  { token, method = "GET", body }: { token?: string | null; method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}/api/m/v1${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    const data = (await res.json().catch(() => ({}))) as { reason?: string };
    throw new SignedOut(data.reason === "moved" ? "moved" : "signed_out");
  }
  if (!res.ok) throw new Error(`The server answered ${res.status}.`);
  const data = (await res.json()) as T;
  rememberServerNow((data as { serverNow?: unknown } | null)?.serverNow);
  return data;
}

/**
 * One call to the exam's own endpoints, /api/app/exam/* — the website's, not
 * a copy. They answer a refusal with its status AND a sentence ("Scan the code
 * at your invigilator's desk first"), and the screen needs both, so this hands
 * back whatever came rather than throwing on anything but a 401 or no signal.
 */
export async function examApi<T = Record<string, unknown>>(
  path: string,
  { token, body }: { token?: string | null; body?: unknown } = {},
): Promise<{ status: number; data: T & { ok?: boolean; reason?: string; message?: string } }> {
  const res = await fetch(`${API_URL}/api/app/exam/${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; reason?: string; message?: string };
  rememberServerNow((data as { serverNow?: unknown }).serverNow);
  if (res.status === 401) throw new SignedOut(data.reason === "moved" ? "moved" : "signed_out");
  return { status: res.status, data };
}
