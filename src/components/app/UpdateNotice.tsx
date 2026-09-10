"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * "There is a newer app" — design's own voice, not a system dialog.
 *
 * Dismissible, and dismissal is remembered against the build number it was
 * dismissed for, so "not now" hides this until a genuinely newer build exists.
 * An app that cannot update itself must not nag as if it could: a student on a
 * ₹8,000 handset with 600 MB free may have a very good reason to wait, and
 * repeating this on every screen would only teach them to ignore the card that
 * one day matters.
 *
 * localStorage rather than a cookie or a row — a per-handset convenience nobody
 * else needs to know, that must never cost a database write. It is read through
 * useSyncExternalStore because that is what it is: an external store. Reading
 * it in an effect and calling setState would be a cascading render, and the
 * server snapshot deliberately reports "dismissed" so a card that is going to
 * be hidden never flashes on screen first.
 */

const KEY = "kids-update-dismissed";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab, or the same app reopened in a second WebView.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    // Private mode, or storage refused. Nothing is dismissed, so it shows —
    // the safe direction to fail in.
    return null;
  }
}

export default function UpdateNotice({
  expected,
  note,
  href,
}: {
  expected: number;
  note: string | null;
  href: string | null;
}) {
  const dismissed = useSyncExternalStore(subscribe, read, () => String(expected));

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(KEY, String(expected));
    } catch {
      // It will ask again next time, which is the harmless way to fail.
    }
    for (const l of listeners) l();
  }, [expected]);

  if (dismissed === String(expected)) return null;

  return (
    <div className="app-update" role="status">
      <div className="app-update__text">
        <strong>A newer app is ready</strong>
        <p>
          {note ?? "This version is behind the one KIDS is running."}{" "}
          {href
            ? "Download it and install it over this one — you stay signed in."
            : "Ask KIDS for the new file. Installing it over this one keeps you signed in."}
        </p>
      </div>
      <div className="app-update__acts">
        {href ? (
          <a className="app-btn app-btn--small" href={href}>
            Get it
          </a>
        ) : null}
        <button type="button" className="app-update__later" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
