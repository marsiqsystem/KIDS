import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { readJson, writeJson } from "@/lib/store";

/**
 * Notice every time the paper leaves the screen, and tell the invigilator's
 * desk — the website's useAwayWatch, on the phone's own signals:
 *
 *   - AppState "background": home button, another app, recent apps, a call.
 *     Recorded as "hidden".
 *   - AppState "inactive" (iPhone) and "blur" (Android): the paper is still
 *     there but something sits over it — the notification shade, Control
 *     Centre, a system sheet. Recorded as "unfocused", and only after 1.5 s,
 *     because a notification sliding past is not a child looking something up.
 *
 * Each period is sent open the moment it starts (the phone may be suspended a
 * second later), and closed when the child comes back. Unsent periods wait on
 * the phone and go with the next attempt; the server keys each on its start,
 * so sending one twice is harmless.
 */
type How = "hidden" | "unfocused";
type Period = { from: string; to: string | null; how: How };

const UNFOCUS_GRACE_MS = 1500;

export function useAwayWatch({
  enabled,
  send,
  storageKey,
}: {
  enabled: boolean;
  /** Posts { away: periods } to /api/app/exam/away; true when it landed. */
  send: (periods: Period[]) => Promise<boolean>;
  storageKey: string;
}) {
  useEffect(() => {
    if (!enabled) return;

    let current: { from: string; how: How } | null = null;
    let unfocusTimer: ReturnType<typeof setTimeout> | null = null;
    let sending = false;

    const read = () => readJson<Period[]>(storageKey) ?? [];
    const write = (list: Period[]) => writeJson(storageKey, list.slice(-200));

    // A period is dropped only once it has gone CLOSED; an open one stays until
    // its closing send succeeds.
    const flush = async () => {
      const list = read();
      if (list.length === 0 || sending) return;
      sending = true;
      try {
        if (await send(list)) {
          const sent = new Set(list.filter((p) => p.to !== null).map((p) => p.from));
          write(read().filter((p) => !sent.has(p.from)));
        }
      } catch {
        // No signal. It stays queued; the next leave, return or tick sends it.
      } finally {
        sending = false;
      }
    };

    const queue = (p: Period) => {
      write([...read().filter((x) => x.from !== p.from), p]);
      void flush();
    };

    const leave = (how: How, from = new Date().toISOString()) => {
      if (current) return;
      current = { from, how };
      queue({ ...current, to: null });
    };

    const back = () => {
      if (unfocusTimer) {
        clearTimeout(unfocusTimer);
        unfocusTimer = null;
      }
      if (!current) return;
      queue({ ...current, to: new Date().toISOString() });
      current = null;
    };

    const covered = () => {
      if (current || unfocusTimer) return;
      // Started from when focus went, not from when the grace ran out.
      const from = new Date().toISOString();
      unfocusTimer = setTimeout(() => {
        unfocusTimer = null;
        leave("unfocused", from);
      }, UNFOCUS_GRACE_MS);
    };

    const subs = [
      AppState.addEventListener("change", (state) => {
        if (state === "active") back();
        else if (state === "background") {
          // Going to the background from a covered screen upgrades it: close the
          // pending grace and record the real thing.
          if (unfocusTimer) {
            clearTimeout(unfocusTimer);
            unfocusTimer = null;
          }
          if (current?.how === "unfocused") back();
          leave("hidden");
        } else if (state === "inactive") covered();
      }),
    ];
    if (Platform.OS === "android") {
      subs.push(AppState.addEventListener("blur", covered));
      subs.push(
        AppState.addEventListener("focus", () => {
          if (current?.how === "unfocused" || unfocusTimer) back();
        }),
      );
    }

    // Anything left from before a restart or a dead battery goes now, and the
    // queue is retried every 20 seconds while the paper runs.
    void flush();
    const tick = setInterval(() => void flush(), 20_000);

    return () => {
      subs.forEach((s) => s.remove());
      if (unfocusTimer) clearTimeout(unfocusTimer);
      clearInterval(tick);
      if (current) back();
    };
  }, [enabled, send, storageKey]);
}
