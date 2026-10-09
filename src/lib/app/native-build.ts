/**
 * The native app's build numbers — the store app in mobile/, not the
 * Capacitor APK (that one is src/lib/app/app-build.ts).
 *
 * `android.versionCode` and `ios.buildNumber` in mobile/app.json are the build
 * a phone carries; the phone asks GET /api/m/v1/version and compares.
 *
 *   NATIVE_LATEST  the newest build in the stores. Below it: a quiet card
 *                  saying an update is there, which the child may dismiss.
 *   NATIVE_MINIMUM the oldest build that still works against this server.
 *                  Below it: the app stops at one screen with the store button,
 *                  because a screen that half-works against a changed API is
 *                  worse than a clear "update first".
 *
 * Raise LATEST when a build reaches the stores. Raise MINIMUM only when the
 * API changes in a way old builds cannot survive — and only after that build
 * has been in the stores long enough to be installed.
 */
export const NATIVE_LATEST = 10;
export const NATIVE_MINIMUM = 10;

/** One line on what the newest build changes, shown on the update card. */
export const NATIVE_NOTES = "The first build of the KIDS app from the stores.";

export const STORE = {
  android: "https://play.google.com/store/apps/details?id=org.kidskolkata.set",
  // Not known until the app is listed: Apple issues the id at submission. Until
  // then an iPhone is sent to the website's install page.
  ios: "https://www.kidskolkata.org/app/install",
};
