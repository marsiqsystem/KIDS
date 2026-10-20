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

/**
 * fetch with a time limit, and one more try on a fresh connection.
 *
 * React Native's fetch has NO timeout. A phone that comes back from the camera
 * or another app on mobile data often reuses a connection the network has
 * already dropped without saying so, and the request sits on it until Android
 * gives up — tens of seconds of "Opening" on the exam (20 Oct 2026, Umar's
 * phone on 5G: tapped at 5:52, the server heard it at 5:53:30, then answered
 * the next two calls in 0.2 s). So each try is cut off, and tried once more.
 *
 * Tried twice only where a second try is harmless: reads, and the exam's own
 * calls, which the server treats exactly like the first (a second start,
 * choice, save or hand-in changes nothing). Anything else — a registration, a
 * password — is cut off but not repeated, so it can never happen twice.
 */
const TRY_MS = 12_000;

async function fetchWithRetry(url: string, init: RequestInit, tries = 2): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TRY_MS);
    try {
      return await fetch(url, { ...init, signal: abort.signal });
    } catch (e) {
      if (attempt >= tries) throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

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
  const res = await fetchWithRetry(`${API_URL}/api/m/v1${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }, method === "GET" ? 2 : 1);
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
  const res = await fetchWithRetry(`${API_URL}/api/app/exam/${path}`, {
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
