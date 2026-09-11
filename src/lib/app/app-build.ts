/**
 * Which build of the Android app the server currently expects.
 *
 * Deliberately a file with no imports and one number in it, because BOTH sides
 * read it: capacitor.config.ts bakes it into the WebView's user-agent at build
 * time, and the server compares what a phone reports against it. A version
 * check whose two halves are typed separately is a version check that lies the
 * first time somebody edits one of them.
 *
 * Bump it when a build carries something the server needs the phone to have —
 * a new native permission, a changed storage key, a fix to the WebView shell.
 * Do NOT bump it for a change to the screens: those are served fresh from the
 * server on every load, so every phone already has them.
 */
export const APP_BUILD = 3;

/**
 * What changed, shown to the student so "update" is a request with a reason
 * rather than an order. Keyed by build number; the newest one is what a stale
 * phone is told.
 */
export const BUILD_NOTES: Record<number, string> = {
  2: "Points at the live KIDS server instead of a test machine, and shows a proper screen when your phone has no signal.",
  3: "Lets you speak in a live class. Build 2 could only listen — your microphone and camera were never asked for, so raising your hand and being unmuted did nothing.",
};
