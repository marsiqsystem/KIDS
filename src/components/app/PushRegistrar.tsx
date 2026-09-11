"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerPush, unregisterPush } from "@/app/app/push-actions";

/**
 * Hands this phone's Firebase token to the server, once, inside the app.
 *
 * Renders nothing. It sits in the shell layout because that is the one place on
 * the student's side of the door that runs on every tab, which is also where
 * the update card lives and for the same reason.
 *
 * ## Why this is native and not a service worker
 *
 * The obvious build was web push. Android's System WebView has no Push API, so
 * inside the APK a service-worker subscription cannot exist at all — the
 * reasoning is written out in src/lib/app/push.ts. Everything here is therefore
 * a no-op in a browser, which is most of the file's control flow: `isApp()`
 * fails, nothing is imported, and the website behaves exactly as before.
 *
 * ## Asked once, ever
 *
 * Android 13 and later treat notifications as a runtime permission, and a
 * permission dialog on every launch is how a student learns to dismiss them
 * without reading. So the ask happens once and the fact that it happened is
 * remembered here on the phone. A student who says no is never asked again by
 * this code; they turn it back on in Android's own settings, where they turned
 * it off, and the next launch sees it granted and registers.
 */

const ASKED = "kids_push_asked";

function isApp(): boolean {
  return typeof navigator !== "undefined" && /kids-app/i.test(navigator.userAgent);
}

function alreadyAsked(): boolean {
  try {
    return window.localStorage.getItem(ASKED) === "1";
  } catch {
    // Storage refused. Treat it as asked: a prompt on every single launch is
    // worse than no prompt at all.
    return true;
  }
}

function rememberAsked(): void {
  try {
    window.localStorage.setItem(ASKED, "1");
  } catch {
    /* nothing to do; see above */
  }
}

export default function PushRegistrar({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    /**
     * `enabled` is the SERVER's answer to "is there a Firebase project?" —
     * pushConfigured(), read in the shell layout.
     *
     * Without it this asked a student for notification permission, created a
     * channel and called register() on a build that had no Firebase behind it.
     * That is a permission prompt with nothing on the other end of it, and it
     * put native code that cannot work in the path of every sign-in. A phone
     * has no way to know whether the server it loaded these screens from can
     * send it anything; only the server knows, so the server says.
     */
    if (!enabled || !isApp()) return;
    let live = true;

    (async () => {
      // Imported here, not at the top of the file, so the plugin is never in
      // the bundle a browser downloads — it is 0 bytes of use to the website.
      const { PushNotifications } = await import("@capacitor/push-notifications");

      /**
       * Android 8 and later drop any notification whose channel does not exist,
       * silently and with nothing in the log. The id must match the
       * `channel_id` the server sends in every message.
       */
      try {
        await PushNotifications.createChannel({
          id: "kids-notices",
          name: "Notices from KIDS",
          description: "Posts from the office, and when a class opens.",
          importance: 4,
          visibility: 1,
        });
      } catch {
        // createChannel is Android-only; on any other platform it throws and
        // the absence of a channel is correct there.
      }

      let status = await PushNotifications.checkPermissions();
      if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
        if (alreadyAsked()) return;
        rememberAsked();
        status = await PushNotifications.requestPermissions();
      }
      if (!live) return;

      if (status.receive !== "granted") {
        // Turned off, here or in Android's settings. Drop the stored token so
        // the server stops counting this phone as reachable and stops spending
        // a send on it.
        void unregisterPush();
        return;
      }

      /**
       * The token arrives on an event, not as a return value: Firebase may hand
       * over a different one at any time (a reinstall, a restore onto a new
       * handset, its own rotation). So the listener stays attached for the life
       * of the screen and re-registers whenever it fires, rather than reading
       * once at startup.
       */
      await PushNotifications.addListener("registration", (t) => {
        void registerPush(t.value);
      });

      await PushNotifications.addListener("registrationError", (err) => {
        // Almost always a missing or wrong google-services.json in the build.
        console.error("Push: Firebase would not issue a token.", err);
      });

      /**
       * Tapping the notification opens the screen it is about. The server sends
       * the path; a message without one, or with anything that is not a path
       * under the app, just opens the app — a notification must never be able
       * to steer the WebView somewhere off our own origin.
       */
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const path = action.notification.data?.path;
        if (typeof path === "string" && /^\/app(\/|$)/.test(path)) router.push(path);
      });

      await PushNotifications.register();
    })().catch((err) => {
      /**
       * A build with no google-services.json has the plugin but no Firebase to
       * talk to, and `register()` throws. That state is normal — it is every
       * build until the Firebase project exists — and it must cost the student
       * nothing. Notifications are a courtesy; the notices are in the app
       * whether or not any of this worked.
       */
      console.error("Push: not available on this build.", err);
    });

    return () => {
      live = false;
    };
  }, [enabled, router]);

  return null;
}
