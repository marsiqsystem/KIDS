import Constants from "expo-constants";

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
  return (await res.json()) as T;
}
