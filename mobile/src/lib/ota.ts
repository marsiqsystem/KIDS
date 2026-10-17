import { useEffect } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

/**
 * New screens without a store review (EAS Update).
 *
 * expo-updates already checks once at every cold start (app.json
 * checkAutomatically ON_LOAD). An Android phone can keep the app alive for days,
 * so this asks again whenever the app comes back to the front, at most once an
 * hour. Whatever arrives is only downloaded: it takes over at the next launch,
 * never by reloading the screen in front of the child — a paper being answered
 * or a class in progress is never interrupted.
 *
 * Off (Updates.isEnabled false) in development, and in any build made before the
 * Expo project existed; then this does nothing.
 */
const EVERY_MS = 60 * 60 * 1000;

export function useOtaRefresh() {
  useEffect(() => {
    if (!Updates.isEnabled) return;
    let last = Date.now();
    let busy = false;
    const sub = AppState.addEventListener("change", async (s) => {
      if (s !== "active" || busy || Date.now() - last < EVERY_MS) return;
      busy = true;
      last = Date.now();
      try {
        const found = await Updates.checkForUpdateAsync();
        if (found.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // No signal, or the update server down: the screens in hand still work.
      } finally {
        busy = false;
      }
    });
    return () => sub.remove();
  }, []);
}
