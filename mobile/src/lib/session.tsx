import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import * as SecureStore from "expo-secure-store";
import { getRandomBytes } from "expo-crypto";
import { api, examApi, SignedOut } from "./api";

/**
 * Who is signed in on this phone.
 *
 * The token is the same signed session the website keeps in a cookie
 * (src/lib/app/session.ts on the server). Here it lives in the phone's
 * secure storage — Keychain on iPhone, Keystore-backed on Android — so
 * clearing a browser does not sign a child out, and another app cannot read it.
 *
 * The device id is this install's own: 16 random bytes, made once and kept.
 * The server binds the account to it (one account, one phone at a time) and
 * signs it into the token, so a copied token cannot claim another phone.
 */
const TOKEN = "kids.session";
const DEVICE = "kids.device";

export type Student = {
  uid: string;
  name: string;
  firstName: string;
  class: string;
  stream: string | null;
  school: string;
  centre: string;
};

export type SignInResult =
  | { ok: true; mustChange: boolean }
  | { ok: false; field: "uid" | "password"; message: string; next?: { label: string; to: "claim" | "reset" | "ask" | "signin" } };

type Session = {
  /** Still reading storage on launch: show nothing yet. */
  loading: boolean;
  token: string | null;
  student: Student | null;
  /** Why the last session ended, when the server or a deletion ended it. */
  endedBecause: "moved" | "deleted" | null;
  signIn: (uid: string, password: string) => Promise<SignInResult>;
  /**
   * The account is on a one-time password (office-issued, or opened by an
   * approval). Until it is replaced the app shows only "choose your password".
   */
  mustChange: boolean;
  /** A session handed over by claiming or by an approval: keep it, as sign-in does. */
  adopt: (token: string, mustChange: boolean) => Promise<void>;
  /** The one-time password was replaced: the app opens. */
  passwordChosen: () => void;
  signOut: () => Promise<void>;
  /** The account was just deleted: forget the token and say so at the door. */
  deleted: () => Promise<void>;
  /**
   * Any signed-in API call. If the server refuses the token — expired, or the
   * account has moved to another phone — the phone is signed out here, once,
   * and the layout takes the student back to the front door.
   */
  call: <T>(path: string, opts?: { method?: "GET" | "POST"; body?: unknown }) => Promise<T>;
  /** A POST to the exam's endpoints (/api/app/exam/<path>): status and body, refusals included. */
  exam: <T = Record<string, unknown>>(path: string, body?: unknown) => ReturnType<typeof examApi<T>>;
};

const Ctx = createContext<Session | null>(null);

export function useSession(): Session {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>.");
  return value;
}

/** This installation's id (32 hex), made once and kept — what device binding and approvals key on. */
export async function deviceId(): Promise<string> {
  const known = await SecureStore.getItemAsync(DEVICE);
  if (known && /^[0-9a-f]{32}$/.test(known)) return known;
  const id = Array.from(getRandomBytes(16), (b) => b.toString(16).padStart(2, "0")).join("");
  await SecureStore.setItemAsync(DEVICE, id);
  return id;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [endedBecause, setEndedBecause] = useState<"moved" | "deleted" | null>(null);
  const [mustChange, setMustChange] = useState(false);

  const forget = useCallback(async (why: "moved" | "deleted" | null) => {
    await SecureStore.deleteItemAsync(TOKEN);
    setToken(null);
    setStudent(null);
    setMustChange(false);
    setEndedBecause(why);
  }, []);

  /** Ask the server who this token belongs to; a refusal signs the phone out. */
  const load = useCallback(
    async (t: string) => {
      try {
        const me = await api<{ ok: true; student: Student; mustChange?: boolean }>("/me", { token: t });
        setStudent(me.student);
        setMustChange(Boolean(me.mustChange));
      } catch (e) {
        if (e instanceof SignedOut) await forget(e.reason === "moved" ? "moved" : null);
        // Anything else is the network: keep the session, show what we have.
      }
    },
    [forget],
  );

  useEffect(() => {
    (async () => {
      const t = await SecureStore.getItemAsync(TOKEN);
      if (t) {
        setToken(t);
        await load(t);
      }
      setLoading(false);
    })();
  }, [load]);

  /** Keep a session the server has just issued, from whichever door it came. */
  const keep = useCallback(
    async (t: string, must: boolean) => {
      await SecureStore.setItemAsync(TOKEN, t);
      setEndedBecause(null);
      setMustChange(must);
      setToken(t);
      await load(t);
    },
    [load],
  );
  const passwordChosen = useCallback(() => setMustChange(false), []);

  const signIn = useCallback(
    async (uid: string, password: string): Promise<SignInResult> => {
      const res = await api<
        | { ok: true; token: string; expiresAt: number; mustChange: boolean }
        | Extract<SignInResult, { ok: false }>
      >("/session", { method: "POST", body: { uid, password, deviceId: await deviceId() } });
      if (!res.ok) return res;
      await keep(res.token, res.mustChange);
      return { ok: true, mustChange: res.mustChange };
    },
    [keep],
  );

  // Before the token goes: tell the server this phone stops receiving this
  // account's notifications, or a shared handset would go on ringing for a
  // child who has signed out. Best effort — signing out never waits on signal.
  const signOut = useCallback(async () => {
    if (token) await api("/push", { method: "POST", body: { token: null }, token }).catch(() => {});
    await forget(null);
  }, [token, forget]);
  const deleted = useCallback(() => forget("deleted"), [forget]);

  const call = useCallback(
    async <T,>(path: string, opts: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> => {
      try {
        return await api<T>(path, { ...opts, token });
      } catch (e) {
        if (e instanceof SignedOut) await forget(e.reason === "moved" ? "moved" : null);
        throw e;
      }
    },
    [token, forget],
  );

  const exam = useCallback(
    async <T,>(path: string, body?: unknown) => {
      try {
        return await examApi<T>(path, { token, body });
      } catch (e) {
        if (e instanceof SignedOut) await forget(e.reason === "moved" ? "moved" : null);
        throw e;
      }
    },
    [token, forget],
  );

  return (
    <Ctx.Provider value={{ loading, token, student, endedBecause, signIn, mustChange, adopt: keep, passwordChosen, signOut, deleted, call, exam }}>{children}</Ctx.Provider>
  );
}
