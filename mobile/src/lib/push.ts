import { useEffect } from "react";
import { Platform } from "react-native";
import { router, type Href } from "expo-router";
import * as Notifications from "expo-notifications";
import { useSession } from "@/lib/session";

/**
 * Push notifications — the native app's half of src/lib/app/push.ts.
 *
 * Only two things are ever pushed (ruled when push was built, 11 Sep 2026): a
 * post written in the control centre, and a class opened by its teacher. Each
 * carries `path`, the website address of the screen it is about, which a tap
 * opens here as the app's own screen.
 *
 * Android: the token is a Firebase token. It only exists once
 * google-services.json is in mobile/ (see app.config.js); until then getting
 * it fails, quietly, and nothing is registered.
 * iPhone: the token is Apple's; the server sends to it through Apple once the
 * company's push key is configured (src/lib/app/apns.ts on the website).
 */

/** The channel the server names (channel_id "kids-notices"). Android 8+ drops a notification without it. */
const CHANNEL = "kids-notices";

// Shown even while the app is open: a class opening is worth a banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** The website's address for a notice, as a screen in this app. */
export function screenForPath(path: unknown): Href | null {
  if (typeof path !== "string") return null;
  const cls = path.match(/^\/app\/class\/(\d+)$/);
  if (cls) return { pathname: "/class/[id]", params: { id: cls[1] } };
  if (path.startsWith("/app/notices")) return "/notices";
  if (path === "/app" || path === "/app/") return "/";
  return null;
}

/**
 * Register this phone for push once a student is signed in, and open the
 * right screen when a notification is tapped — including the one that
 * launched the app.
 */
export function usePush() {
  const { token, call } = useSession();

  useEffect(() => {
    if (!token) return;
    let gone = false;
    (async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync(CHANNEL, {
            name: "Notices and classes",
            importance: Notifications.AndroidImportance.HIGH,
          });
        }
        const asked = await Notifications.getPermissionsAsync();
        const granted = asked.granted || (asked.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
        if (!granted || gone) {
          // Turned off in the phone's settings: stop sending to this phone.
          if (!granted) await call("/push", { method: "POST", body: { token: null } }).catch(() => {});
          return;
        }
        const device = await Notifications.getDevicePushTokenAsync();
        if (!gone && typeof device.data === "string") {
          await call("/push", { method: "POST", body: { token: device.data, platform: Platform.OS === "ios" ? "ios" : "android" } });
        }
      } catch {
        // No Firebase file in this build, or no signal. Notices are still in
        // the app either way; push is an extra, never a requirement.
      }
    })();
    return () => {
      gone = true;
    };
  }, [token, call]);

  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!token || !last || last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const to = screenForPath(last.notification.request.content.data?.path);
    if (to) router.push(to);
  }, [token, last]);
}
