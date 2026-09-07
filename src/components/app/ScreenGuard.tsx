"use client";

import { useEffect } from "react";

/**
 * Block screenshots while a paper is being sat, and only while a paper is
 * being sat.
 *
 * Mount this on a screen that is running an exam. It asks the Android app to
 * set FLAG_SECURE, and clears it again when the screen unmounts — so the
 * student can photograph their own marksheet a minute later, which they should
 * be able to do. See ScreenGuardPlugin.java for why this stopped being an
 * app-wide setting.
 *
 * It does nothing at all in a browser, which is correct rather than a
 * shortcoming: no web page can stop a screenshot, on any platform, and pretending
 * otherwise would be the more dangerous outcome — an invigilator who believes
 * the paper cannot be captured, when on every phone without the app it can.
 *
 * Reached through the global bridge rather than by importing a plugin package.
 * The app loads these screens from the server, so this code also runs in plain
 * browsers where no such package exists; the optional chaining IS the platform
 * check.
 */
interface Guard {
  set(options: { secure: boolean }): Promise<void>;
}

interface Bridge {
  Plugins?: { ScreenGuard?: Guard };
}

function guard(): Guard | undefined {
  return (window as unknown as { Capacitor?: Bridge }).Capacitor?.Plugins?.ScreenGuard;
}

export default function ScreenGuard() {
  useEffect(() => {
    // A rejected promise here must never take the exam down with it. If the
    // flag cannot be set, the paper still has to run — the invigilator in the
    // room is the real control, and always was.
    guard()?.set({ secure: true }).catch(() => {});

    return () => {
      guard()?.set({ secure: false }).catch(() => {});
    };
  }, []);

  return null;
}
