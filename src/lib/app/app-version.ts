import { APP_BUILD, BUILD_NOTES } from "@/lib/app/app-build";

/**
 * Is this the Android app, and is it the build the server expects?
 *
 * The only thing a phone tells us is its user-agent, which capacitor.config.ts
 * appends `KIDS-App/<build>` to. That is enough, and it costs nothing: no
 * endpoint to call, no request from the app, no table.
 *
 * Be clear about what this catches and what it cannot. It catches a phone
 * running an OLD build against the RIGHT server — from now on, the ordinary
 * case, because every future APK points at production. It cannot catch a build
 * pointed at a server that no longer answers: nothing renders at all then, and
 * the student sees the offline card. That failure is the APK's bundled error
 * page's job, not this one's.
 */

export interface AppVersion {
  /** True only inside the Android app. The website must never be nagged. */
  isApp: boolean;
  /** The build the phone reports, or null if it predates the version marker. */
  build: number | null;
  /** True when the phone is behind the server's expectation. */
  stale: boolean;
  /** The build the server wants. */
  expected: number;
  /** Why it is worth their trouble, in one sentence. */
  note: string | null;
}

/**
 * `KIDS-App/2` → 2. Build 1 shipped as `KIDS-App/1.0`, so a decimal is read as
 * its whole part rather than ignored — the first phones in the field are the
 * ones that most need to be told.
 */
export function appBuildFrom(userAgent: string | null | undefined): number | null {
  const m = /kids-app\/(\d+)/i.exec(userAgent ?? "");
  return m ? Number(m[1]) : null;
}

export function appVersion(userAgent: string | null | undefined): AppVersion {
  const isApp = /kids-app/i.test(userAgent ?? "");
  const build = appBuildFrom(userAgent);
  // An app that reports no build at all is older than the marker, so it is
  // stale by definition. A browser is never stale.
  const stale = isApp && (build === null || build < APP_BUILD);

  return {
    isApp,
    build,
    stale,
    expected: APP_BUILD,
    note: stale ? (BUILD_NOTES[APP_BUILD] ?? null) : null,
  };
}

/**
 * Where a student gets the new APK.
 *
 * Optional on purpose. There is no app store and the file is 7.8 MB, so it is
 * hosted wherever KIDS chooses to put it — and until somebody has actually put
 * it somewhere, the screen must not offer a link that goes nowhere. With no URL
 * set the card still appears and tells them to ask KIDS, which is true.
 */
export function apkUrl(): string | null {
  const url = process.env.KIDS_APK_URL?.trim();
  return url && /^https?:\/\//i.test(url) ? url : null;
}
