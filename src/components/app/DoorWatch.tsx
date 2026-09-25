"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Hourglass, KeyRound } from "lucide-react";
import { Notice } from "./door";
import { readOrCreateDeviceId } from "./DeviceField";
import { doorStatusAction, openApprovedAction } from "@/app/app/actions";
import type { DoorStatus } from "@/lib/app/handoff";

/** How often a phone with something pending asks again. Nothing pending, no timer. */
const EVERY_MS = 30_000;
/** A refusal is news for a fortnight, then it is history. */
const REFUSAL_SHOWN_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Watches for the office's approval, and walks straight in when it comes.
 *
 * Sits on the door screens -- sign-in above all, because that is where the app
 * lands when it is opened with no session. So a child who asked for their
 * account yesterday and opens the app this morning is simply signed in: they
 * never see a password box.
 *
 * Asks when the screen opens and whenever the app comes back to the foreground
 * (the moment a child is most likely to be looking), and every thirty seconds
 * only while a request is actually pending. A phone with nothing waiting costs
 * one query per door visit and nothing after it. See src/lib/app/handoff.ts.
 */
/**
 * The watching itself, shared by the sign-in notice and the ask screen. `again`
 * restarts it -- the ask screen calls it the moment a request has been sent.
 */
export function useDoorStatus(): { status: DoorStatus | null; opening: boolean; again: () => void } {
  const [status, setStatus] = useState<DoorStatus | null>(null);
  const [opening, setOpening] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const deviceId = readOrCreateDeviceId();
    if (!deviceId) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const ask = async () => {
      clearTimeout(timer);
      if (stopped || document.visibilityState === "hidden") return;
      try {
        let s = await doorStatusAction(deviceId);
        if (stopped) return;
        if (s.state === "refused" && Date.now() - new Date(s.decidedAt).getTime() > REFUSAL_SHOWN_MS) {
          s = { state: "none" };
        }
        setStatus(s);
        if (s.state === "ready") {
          setOpening(true);
          // Redirects on success. Only returns when the approval was already
          // used -- another tab got there first -- and then there is nothing to wait for.
          await openApprovedAction(deviceId);
          if (stopped) return;
          setOpening(false);
          setStatus({ state: "none" });
          return;
        }
        if (s.state === "waiting") timer = setTimeout(ask, EVERY_MS);
      } catch {
        // Offline, or the server blinked. Try again on the next beat.
        timer = setTimeout(ask, EVERY_MS);
      }
    };

    ask();
    document.addEventListener("visibilitychange", ask);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", ask);
    };
  }, [round]);

  const again = useCallback(() => setRound((r) => r + 1), []);
  return { status, opening, again };
}

export default function DoorWatch() {
  const { status, opening } = useDoorStatus();

  if (opening || status?.state === "ready") {
    return (
      <div className="door-notices">
        <Notice icon={<KeyRound size={20} />} tone="teal" title="Approved by KIDS">
          Opening your account…
        </Notice>
      </div>
    );
  }

  if (status?.state === "waiting") {
    return (
      <div className="door-notices">
        <Notice icon={<Hourglass size={20} />} tone="gold" title="Your request is with the KIDS office">
          When they approve it, this app opens your account by itself. <Link href="/app/claim/ask">See it</Link>
        </Notice>
      </div>
    );
  }

  if (status?.state === "refused") {
    return (
      <div className="door-notices">
        <Notice icon={<Hourglass size={20} />} tone="maroon" title="The office did not approve your request">
          <Link href="/app/claim/ask">See what they wrote</Link>
        </Notice>
      </div>
    );
  }

  return null;
}
