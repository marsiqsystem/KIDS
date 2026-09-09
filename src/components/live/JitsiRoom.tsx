"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The class itself, embedded.
 *
 * One component for both surfaces — the teacher's console on a laptop and the
 * student's phone — because the difference between them is the token, not the
 * screen. A student's token says `moderator: false` and their controls follow
 * from that; there is no second, meeker copy of this file to keep in step.
 *
 * The script comes from our own server rather than a CDN. That is not a
 * preference: `external_api.js` has to match the Jitsi it talks to, and a
 * mismatched copy fails in ways that look like network trouble.
 */

interface JitsiApi {
  dispose(): void;
  addListener(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

export default function JitsiRoom({
  domain,
  room,
  jwt,
  displayName,
  moderator,
  onLeave,
}: {
  domain: string;
  room: string;
  jwt: string;
  displayName: string;
  moderator: boolean;
  /** Where to send them when the call ends. */
  onLeave?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let api: JitsiApi | null = null;
    let cancelled = false;

    async function start() {
      try {
        await loadScript(`https://${domain}/external_api.js`);
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled || !box.current || !window.JitsiMeetExternalAPI) return;

      api = new window.JitsiMeetExternalAPI(domain, {
        roomName: room,
        jwt,
        parentNode: box.current,
        userInfo: { displayName },
        configOverwrite: {
          /**
           * Students arrive muted, camera off.
           *
           * Not a courtesy — arithmetic. The teacher's video out to 65 students
           * is about 100 Mbps and 65 GB across a 90-minute class. Sixty-five
           * cameras coming back is roughly ten times that, and it is not a
           * class anyway. Raise a hand, and the teacher unmutes you.
           */
          startWithAudioMuted: !moderator,
          startWithVideoMuted: !moderator,
          prejoinPageEnabled: false,
          /**
           * Without this, a phone browser — and the Capacitor WebView the
           * students actually use — tries to hand the class to the Jitsi Meet
           * app, which they have not installed and which would not have their
           * token anyway.
           */
          disableDeepLinking: true,
          disableThirdPartyRequests: true,
          // Nothing here should invite a child to invite somebody else.
          disableInviteFunctions: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_CHROME_EXTENSION_BANNER: false,
          TOOLBAR_BUTTONS: moderator
            ? [
                "microphone", "camera", "desktop", "chat", "raisehand",
                "participants-pane", "tileview", "settings", "mute-everyone",
                "mute-video-everyone", "security", "hangup",
              ]
            : ["microphone", "camera", "chat", "raisehand", "tileview", "hangup"],
        },
      });

      if (onLeave) {
        api.addListener("readyToClose", () => {
          window.location.href = onLeave;
        });
      }
    }

    void start();

    return () => {
      cancelled = true;
      // Without this the call keeps running behind a navigation — the
      // microphone stays live and the child has no idea. The daily loop's
      // player learned the same lesson about tearing down on the way out.
      api?.dispose();
    };
  }, [domain, room, jwt, displayName, moderator, onLeave]);

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-semibold">The class could not be reached.</p>
        <p className="text-xs opacity-70">
          The server at {domain} did not answer. Check your connection and try again — if it keeps
          happening, tell the office.
        </p>
      </div>
    );
  }

  return <div ref={box} className="h-full w-full" />;
}

/** Load a script once, and resolve on the copy already loading if there is one. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script failed")));
      return;
    }

    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.addEventListener("load", () => {
      el.dataset.loaded = "1";
      resolve();
    });
    el.addEventListener("error", () => reject(new Error("script failed")));
    document.head.appendChild(el);
  });
}
