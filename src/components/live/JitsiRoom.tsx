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
  executeCommand(command: string, ...args: unknown[]): void;
  isModerationOn(mediaType: string): Promise<boolean>;
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
  /**
   * What the embed is doing, said out loud.
   *
   * A black box is the worst possible failure: it looks identical whether
   * the script was blocked, the effect never ran, or the room is simply
   * slow. On 11 Sep it cost an evening on a phone that turned out never to
   * have made a single request. A child waiting for a class deserves to be
   * told which of those it is, and so does whoever they tell.
   */
  const [stage, setStage] = useState("starting");
  /**
   * Whether the server is actually holding students muted. Null until the
   * answer is known; only ever set on the teacher's side, because only a
   * moderator may ask.
   */
  const [moderated, setModerated] = useState<boolean | null>(null);

  useEffect(() => {
    let api: JitsiApi | null = null;
    let cancelled = false;

    async function start() {
      setStage(`fetching https://${domain}/external_api.js`);
      try {
        await loadScript(`https://${domain}/external_api.js`);
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled) return;
      if (!box.current) return setStage("loaded, but the box was gone");
      if (!window.JitsiMeetExternalAPI) return setStage("loaded, but no JitsiMeetExternalAPI");
      setStage("opening the room");

      api = new window.JitsiMeetExternalAPI(domain, {
        roomName: room,
        jwt,
        parentNode: box.current,
        /**
         * Asked for explicitly. Left out, external_api.js picks its own size
         * for the iframe and Jitsi lays its whole interface out to match —
         * which on a phone meant a toolbar floating in the top third of the
         * screen with black underneath it.
         */
        width: "100%",
        height: "100%",
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
          /**
           * No pre-join screen: tapping the class in the app IS the intent to
           * join, and a second "Join meeting" button in front of a
           * fourteen-year-old is a step to get stuck on.
           *
           * ⚠️ The option is `prejoinConfig.enabled`. The old flat
           * `prejoinPageEnabled` is gone from current Jitsi and is ignored in
           * silence — the same failure shape as a top-level `moderator` claim.
           * Checked against /etc/jitsi/meet/<host>-config.js on the server
           * (Jitsi 2.0.11146), not from memory.
           */
          prejoinConfig: { enabled: false },
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

      setStage("");

      /**
       * Every class runs in moderated mode, switched on by the teacher's own
       * embed the moment they arrive.
       *
       * What this buys: a student cannot put their own microphone or camera on.
       * The SERVER refuses it — they raise a hand, the teacher approves them in
       * the participants pane, and only then does their microphone work.
       *
       * Be exact about the limit, because it is the sort of thing that gets
       * promised and then discovered in front of sixty-five children: nobody in
       * Jitsi can switch ON someone else's microphone, moderator or not. It is
       * a deliberate rule of the client and there is no setting for it. The
       * teacher grants permission; the child still presses the button. So the
       * microphone and camera buttons stay in the student's toolbar — they are
       * what a newly-approved child presses to answer — and moderation is what
       * makes them inert until then. Removing the buttons would look stricter
       * and would actually be weaker: it enforces nothing on anyone who reaches
       * the room another way, and it would leave an approved student with no
       * way to speak.
       *
       * Done here rather than left to the teacher to remember. A rule that has
       * to be switched on before each lesson is a rule that is off for the
       * first ten minutes of some lesson in November.
       */
      if (moderator) {
        api.addListener("videoConferenceJoined", () => {
          api?.executeCommand("toggleModeration", true, "audio");
          api?.executeCommand("toggleModeration", true, "video");

          /**
           * Then ASK whether it took, and put the answer on the teacher's own
           * screen.
           *
           * `toggle-moderation` returns nothing and fails silently: the handler
           * in the served bundle begins `if (!isModerator(state)) return`, and
           * beyond that it dispatches into a feature that does nothing at all
           * unless Prosody's `av_moderation` module is loaded. Every one of
           * those failures looks exactly like success from here.
           *
           * This project has now been caught three times by an absence read as
           * a result — the token modules that were named but never loaded, a
           * CSS rule that matched nothing, an install whose seds quietly did
           * not run. So the teacher is told, in a line above their own video,
           * whether students are actually held. A wrong answer on screen is
           * worth more than a right one nobody can see.
           *
           * Queried once the conference is up, and refreshed from the
           * conference's own event thereafter.
           */
          void api
            ?.isModerationOn("audio")
            .then((on) => setModerated(on))
            .catch(() => setModerated(false));
        });

        api.addListener("moderationStatusChanged", (...args) => {
          const e = args[0] as { mediaType?: string; enabled?: boolean } | undefined;
          if (e?.mediaType === "audio") setModerated(Boolean(e.enabled));
        });
      }

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

  return (
    /* ⚠️ THIS COMPONENT FILLS ITS PARENT ABSOLUTELY. Whatever renders it must
       carry `position: relative` and a real height of its own.

       Not `h-full`, which is `height: 100%`, which resolves against the
       PARENT'S height - and the parent on both surfaces is a flex item whose
       height CSS does not consider definite. It resolves to auto, the wrapper
       collapses to zero, and with the iframe pinned to `inset-0` inside it the
       class becomes zero by zero: Jitsi running perfectly, audio flowing, and
       nothing at all on screen. class.css already carries this same warning one
       level up about `.app-shell`; it is the same trap twice.

       The iframe itself is created by external_api.js, which sizes it. Left
       alone it came out a few hundred pixels tall, so Jitsi laid its whole
       interface out for that - a toolbar floating in the top third of a phone
       with black underneath. Pinned here rather than in either surface's
       stylesheet: the teacher console styles its box with Tailwind and has no
       CSS file of its own, so a rule in the student's would fix one screen and
       not the other.

       `&_iframe` is a DESCENDANT selector. `&>iframe`, which was here first,
       matched nothing at all - the iframe is created inside the ref'd box and
       so is this element's grandchild. A selector that silently matches nothing
       looks exactly like one that is wrong about what it does. */
    <div className="absolute inset-0 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:!h-full [&_iframe]:!w-full [&_iframe]:border-0">
      <div ref={box} className="absolute inset-0" />
      {stage ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 px-4 text-center text-xs text-white/70">
          {stage}
        </p>
      ) : null}
      {/* Only the teacher, and only once the conference has answered. Says what
          IS, not what was asked for — see the note by the toggle above. */}
      {moderator && moderated !== null ? (
        <p
          className={`pointer-events-none absolute inset-x-0 top-0 px-3 py-1 text-center text-[11px] ${
            moderated ? "bg-black/50 text-white/70" : "bg-[#6b3f3f] font-semibold text-white"
          }`}
        >
          {moderated
            ? "Students are held muted until you allow them."
            : "⚠ Students can unmute themselves — the server is not holding them."}
        </p>
      ) : null}
    </div>
  );
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
