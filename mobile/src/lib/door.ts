import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { api } from "@/lib/api";
import { deviceId, useSession } from "@/lib/session";

/**
 * Watching for the office's approval — the website's useDoorStatus
 * (src/components/app/DoorWatch.tsx), natively.
 *
 * Asks when a door screen opens, whenever the app comes back to the
 * foreground (when a child is most likely to be looking), and every thirty
 * seconds only while something is actually pending. When an approval is
 * waiting for THIS phone, it takes it (/door/open, used once) and the phone is
 * signed in with nothing typed; the first screen then asks for a password of
 * the child's own.
 */
export type DoorStatus =
  | { state: "none" }
  | { state: "ready"; uid: string }
  | { state: "waiting"; kind: "claim" | "reset"; uid: string; typedName: string; requestedAt: string }
  | { state: "refused"; kind: "claim" | "reset"; uid: string; reason: string | null; decidedAt: string };

export type Application = {
  id: string;
  name: string;
  class: string;
  school_name: string;
  status: "pending" | "approved" | "rejected" | string;
  applied_at: string;
  uid: string | null;
  reason: string | null;
};

const EVERY_MS = 30_000;
/** A refusal is news for a fortnight, then it is history. */
const REFUSAL_SHOWN_MS = 14 * 24 * 60 * 60 * 1000;

export function useDoorWatch() {
  const { adopt } = useSession();
  const [door, setDoor] = useState<DoorStatus | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [opening, setOpening] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ask = async () => {
      clearTimeout(timer);
      if (stopped || AppState.currentState !== "active") return;
      try {
        const id = await deviceId();
        const r = await api<{ door: DoorStatus; application: Application | null }>("/door/status", { method: "POST", body: { deviceId: id } });
        if (stopped) return;
        let d = r.door;
        if (d.state === "refused" && Date.now() - new Date(d.decidedAt).getTime() > REFUSAL_SHOWN_MS) d = { state: "none" };
        setDoor(d);
        setApplication(r.application);
        if (d.state === "ready") {
          setOpening(true);
          const o = await api<{ ok: boolean; token?: string }>("/door/open", { method: "POST", body: { deviceId: id } });
          // On success the layout swaps the door for "choose your password".
          if (o.ok && o.token) await adopt(o.token, true);
          else if (!stopped) {
            setOpening(false);
            setDoor({ state: "none" });
          }
          return;
        }
        if (d.state === "waiting" || r.application?.status === "pending") timer = setTimeout(ask, EVERY_MS);
      } catch {
        // No signal, or the server blinked. Try again on the next beat.
        timer = setTimeout(ask, EVERY_MS);
      }
    };

    ask();
    const sub = AppState.addEventListener("change", (s) => s === "active" && ask());
    return () => {
      stopped = true;
      clearTimeout(timer);
      sub.remove();
    };
  }, [round, adopt]);

  const again = useCallback(() => setRound((r) => r + 1), []);
  return { door, application, opening, again };
}
