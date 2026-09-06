"use client";

import { useEffect, useState } from "react";

const KEY = "kids_device_id";

/**
 * This phone's id, carried into the sign-in and claim forms.
 *
 * Generated here rather than on the server because a cookie cannot be set
 * during a Server Component render — Next only allows `cookies().set()` inside
 * a Server Function or a Route Handler — and because the value has to outlive
 * cookie clearing to be worth anything. It is written once, on first run, and
 * then never changes.
 *
 * `localStorage` is the right store for exactly this. It is per-origin, it
 * survives closing the app, and in a Capacitor WebView it is the app's own
 * private storage — so the same code produces a stable installation id on the
 * website and inside the Android app, with nothing platform-specific written
 * twice.
 *
 * What it is not: a fingerprint. It is a random number this installation gave
 * itself. It identifies nobody until an account signs in on it, it is worthless
 * off this phone, and clearing the app's data throws it away. Those limits are
 * stated in src/lib/app/devices.ts, which is the only thing that reads it.
 */
function readOrCreate(): string {
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && /^[0-9a-f]{32}$/.test(existing)) return existing;

    const made = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(KEY, made);
    return made;
  } catch {
    // Private browsing, or storage refused. The session is issued unbound and
    // the device rule simply does not apply to it — never a blocked sign-in.
    return "";
  }
}

export default function DeviceField() {
  const [deviceId, setDeviceId] = useState("");

  // In an effect, not during render: this touches window, and the sign-in page
  // is server-rendered. The field is empty for the moment before hydration,
  // which cannot matter — nobody has typed a password yet.
  useEffect(() => setDeviceId(readOrCreate()), []);

  return <input type="hidden" name="deviceId" value={deviceId} readOnly />;
}
