"use client";

import { useEffect } from "react";

/**
 * Notice every time the paper leaves the screen, and tell the server.
 *
 * Runs only while a paper is being sat in the app (LiveExam passes `enabled`).
 * Three signals, because no single one covers every phone:
 *
 *   - `pause` / `resume` on document — fired by the Android app's own shell
 *     (Capacitor) when it goes to the background: home button, another app,
 *     recent apps, a call. The most reliable signal inside the APK.
 *   - `visibilitychange` — the browser's version of the same, for a child on
 *     an iPhone home-screen app or a plain browser.
 *   - `blur` / `focus` on window — the paper is still showing but something else
 *     has the focus: split screen, a pop-up, the notification shade pulled down.
 *     Recorded as "unfocused", and only after 1.5 s, because a notification
 *     sliding past is not a child looking something up.
 *
 * Each period is sent twice: open the moment it starts (so the desk can show
 * "away now" — the phone may be suspended a second later and send nothing
 * more), and closed when the child comes back. Unsent periods wait in this
 * phone's storage and go with the next attempt, so a child with no signal is
 * still recorded once the signal returns. The server keys each on its start,
 * so sending one twice is harmless.
 */

type How = "hidden" | "unfocused";
type Period = { from: string; to: string | null; how: How };

const UNFOCUS_GRACE_MS = 1500;

export function useAwayWatch({
  enabled,
  api,
  storageKey,
}: {
  enabled: boolean;
  api: string;
  storageKey: string;
}) {
  useEffect(() => {
    if (!enabled) return;

    let current: { from: string; how: How } | null = null;
    let unfocusTimer: ReturnType<typeof setTimeout> | null = null;
    let sending = false;

    const read = (): Period[] => {
      try {
        return JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as Period[];
      } catch {
        return [];
      }
    };
    const write = (list: Period[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(list.slice(-200)));
      } catch {
        // Private mode: periods are still sent from memory below, just not kept.
      }
    };

    /** Add or update one period in the queue, then try to send the queue. */
    const queue = (p: Period) => {
      const list = read().filter((x) => x.from !== p.from);
      list.push(p);
      write(list);
      void flush(true);
    };

    /**
     * Send everything waiting. `keepalive` lets the request finish even as the
     * app is being put in the background, which is exactly when it is sent.
     * A period is dropped from the queue only once it has gone CLOSED; an open
     * one stays until its closing send succeeds.
     */
    const flush = async (keepalive = false) => {
      const list = read();
      if (list.length === 0 || (sending && !keepalive)) return;
      sending = true;
      try {
        const res = await fetch(`${api}/away`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ away: list }),
          keepalive,
        });
        if (res.ok) {
          const sent = new Set(list.filter((p) => p.to !== null).map((p) => p.from));
          write(read().filter((p) => !sent.has(p.from)));
        }
      } catch {
        // No signal. It stays queued; the next leave, return or tick sends it.
      } finally {
        sending = false;
      }
    };

    const leave = (how: How) => {
      if (current) return;
      current = { from: new Date().toISOString(), how };
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

    const onVisibility = () => (document.visibilityState === "hidden" ? leave("hidden") : back());
    const onPause = () => leave("hidden");
    const onResume = () => back();
    const onBlur = () => {
      if (current || unfocusTimer) return;
      // Started from when focus went, not from when the grace ran out.
      const from = new Date().toISOString();
      unfocusTimer = setTimeout(() => {
        unfocusTimer = null;
        if (current) return;
        current = { from, how: "unfocused" };
        queue({ ...current, to: null });
      }, UNFOCUS_GRACE_MS);
    };
    const onFocus = () => {
      if (current?.how === "unfocused" || unfocusTimer) back();
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pause", onPause);
    document.addEventListener("resume", onResume);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    // Anything left from before a reload or a dead battery goes now, and the
    // queue is retried every 20 seconds while the paper runs.
    void flush();
    const tick = setInterval(() => void flush(), 20_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pause", onPause);
      document.removeEventListener("resume", onResume);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      if (unfocusTimer) clearTimeout(unfocusTimer);
      clearInterval(tick);
      // Submitted or closed while away is not possible from this screen, but a
      // period still open here is closed now rather than left hanging.
      if (current) back();
    };
  }, [enabled, api, storageKey]);
}
