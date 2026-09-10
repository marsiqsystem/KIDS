import type { CapacitorConfig } from "@capacitor/cli";
import { APP_BUILD } from "./src/lib/app/app-build";

/**
 * The Android app.
 *
 * This wraps the student app that already exists rather than reimplementing
 * it. The 40 screens under src/app/app are loaded from the live server into the
 * app's own WebView, which is why there is no second copy of the daily loop,
 * the question bank or the record screens to keep in step with the first.
 *
 * Stated plainly, because it is the thing to be honest about: this is a system
 * WebView, not native UI code. What it genuinely buys over the website —
 * and these are the things to actually test on a handset:
 *
 *   * Its own icon on the home screen, opening full-screen with no address
 *     bar, no tabs and nothing to share as a link.
 *   * FLAG_SECURE — screenshots and screen recording are refused by the
 *     operating system. See MainActivity.java. A browser cannot do this.
 *   * A storage area that belongs to the app, so the device id in
 *     DeviceField.tsx is not cleared by clearing browser history.
 *   * A place for FCM push to arrive later.
 *
 * What it does not buy, so that nobody discovers it during an exam: it cannot
 * stop a student leaving the app. True lockdown is Android's lock task mode,
 * and an ordinary installed app may not enter it — that needs the phone
 * enrolled as a device-owner through MDM provisioning, which is not something
 * that can be done to 9,655 children's own phones. Leaving is *detectable*
 * here, not preventable.
 *
 * WHICH SERVER IT TALKS TO is a build-time decision, not a hardcode, because
 * three different answers are all correct at different moments:
 *
 *   KIDS_APP_URL=http://192.168.0.135:3000   this laptop, for testing tonight
 *   KIDS_APP_URL=https://<branch>.vercel.app the student-app preview
 *   (unset)                                  production, once /app is merged
 *
 * The consequence of loading from a server: the app needs a connection. There
 * is no offline mode, and there cannot be one until the ten server actions
 * become an HTTP API and the screens are exported statically. That is the next
 * piece of work, not this one.
 */

const url = process.env.KIDS_APP_URL?.trim() || "https://www.kidskolkata.org";

const config: CapacitorConfig = {
  appId: "org.kidskolkata.set",
  appName: "SET · KIDS",

  /**
   * Unused at runtime while `server.url` is set — the WebView goes straight to
   * the server. It is still required by the CLI, and it is not wasted: it is
   * what a student sees when the phone has no connection at all, which is the
   * one screen the server can never deliver.
   */
  webDir: "native/www",

  server: {
    url: `${url}/app`,
    /**
     * Cleartext only when it is actually needed, i.e. testing against this
     * laptop over http on the LAN. Android blocks plain http by default and it
     * should stay blocked for anything a student installs.
     */
    cleartext: url.startsWith("http://"),
    /**
     * What to show when the server cannot be reached.
     *
     * Without this the WebView simply fails and leaves a white rectangle, with
     * nothing on screen to say the app is fine and the network is not. That is
     * exactly what happened on the first install, and it is indistinguishable
     * from a broken app — so it cost an evening working out that the answer was
     * "no dev server was running".
     *
     * A student on a bus with no signal must never see that blank screen.
     */
    errorPath: "index.html",
  },

  android: {
    /**
     * The WebView identifies itself so the server can tell the app from the
     * website. Two things read it: describeDevice() in src/lib/app/devices.ts,
     * which labels a device "The KIDS app" on the Profile screen, and
     * appVersion() in src/lib/app/app-version.ts, which compares the build
     * number against what the server expects.
     *
     * The number comes from src/lib/app/app-build.ts rather than being typed
     * here, because the server reads that same file. A version check with its
     * two halves typed separately lies the first time somebody edits one.
     *
     * Build 1 shipped as "KIDS-App/1.0" before this existed; appBuildFrom()
     * reads that as 1, so the phones already in the field are told correctly.
     */
    appendUserAgent: `KIDS-App/${APP_BUILD}`,
    // A student on a ₹8,000 handset is the case that matters; hardware
    // acceleration off would show immediately in the daily loop's transitions.
    webContentsDebuggingEnabled: false,
  },
};

export default config;
