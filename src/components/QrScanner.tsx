"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleAlert, Loader2, ScanLine } from "lucide-react";

/**
 * The QR scanner, for students whose phone camera cannot scan a QR code itself.
 *
 * Most Android camera apps and every iPhone can already do this; the cheapest
 * handsets cannot, and their owners are exactly the students who can least
 * afford to be locked out. This page is that fallback.
 *
 * SECURITY: a scanner that opens whatever URL it decodes is a phishing gadget —
 * print a poster with a malicious QR, tape it to a wall at the centre, and a
 * child hands over their session. So we never navigate to the scanned URL. We
 * pull the id and token out of it, check they are the right shape, and navigate
 * to OUR OWN /portal. Anything that is not a kidskolkata.org portal link is
 * refused out loud.
 */

const ALLOWED_HOSTS = ["kidskolkata.org", "www.kidskolkata.org"];

type Found = { uid: string; token: string };

/** Pull a student out of a scanned string, or refuse it. */
export function readCard(raw: string, selfOrigin: string): Found | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null; // not a URL at all
  }

  const self = (() => {
    try {
      return new URL(selfOrigin).host;
    } catch {
      return "";
    }
  })();

  // Our production host, or whatever host is serving this page (so the same code
  // is exercised on localhost and on a preview deploy).
  if (!ALLOWED_HOSTS.includes(url.host) && url.host !== self) return null;
  if (!url.pathname.startsWith("/portal")) return null;

  const uid = (url.searchParams.get("id") ?? "").replace(/\D/g, "");
  const token = url.searchParams.get("t") ?? "";
  if (uid.length !== 9 || !token) return null;

  return { uid, token };
}

/* The browser's own barcode reader. Not in TypeScript's DOM lib yet. */
type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => Detector;
  }
}

type State = "idle" | "starting" | "scanning" | "denied" | "unsupported" | "rejected" | "found";

export default function QrScanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>("idle");

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  // The camera must be released when the student leaves, or the light stays on
  // and the battery they need for the exam drains in their pocket.
  useEffect(() => stop, [stop]);

  const scan = useCallback(async () => {
    if (typeof window === "undefined" || !window.BarcodeDetector) {
      setState("unsupported");
      return;
    }

    setState("starting");

    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch {
      setState("denied");
      return;
    }

    const el = video.current;
    if (!el) return;
    el.srcObject = stream.current;
    await el.play().catch(() => {});
    setState("scanning");

    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

    // Four looks a second. A tight loop would cook a cheap phone and eat the
    // battery it needs to last until 11:00.
    const id = setInterval(async () => {
      if (!video.current || video.current.readyState < 2) return;

      let codes: { rawValue: string }[] = [];
      try {
        codes = await detector.detect(video.current);
      } catch {
        return; // a dropped frame is not an error
      }

      for (const code of codes) {
        const card = readCard(code.rawValue, window.location.origin);
        if (card) {
          clearInterval(id);
          stop();
          setState("found");
          router.push(`/portal?id=${card.uid}&t=${encodeURIComponent(card.token)}`);
          return;
        }
        // A QR code, but not an admit card. Say so — do not follow it.
        setState("rejected");
      }
    }, 250);

    return () => clearInterval(id);
  }, [router, stop]);

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--cream-muted)] bg-[var(--maroon-deep)]">
        <video
          ref={video}
          playsInline
          muted
          className={`h-full w-full object-cover ${state === "scanning" || state === "rejected" || state === "found" ? "" : "hidden"}`}
        />

        {(state === "scanning" || state === "rejected") && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="h-3/5 w-3/5 rounded-2xl border-4 border-[var(--gold)] shadow-[0_0_0_100vmax_rgb(61_10_16/45%)]" />
          </div>
        )}

        {(state === "idle" || state === "starting") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <ScanLine className="h-12 w-12 text-[var(--gold-light)]" aria-hidden="true" />
            <p className="mt-4 text-sm leading-relaxed text-[#d8e6e2]">
              Point your camera at the QR code printed on your admit card.
            </p>
          </div>
        )}
      </div>

      {state === "idle" && (
        <button
          onClick={scan}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--maroon)] py-4 text-lg font-semibold text-[var(--cream)] transition hover:brightness-110"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Turn on camera
        </button>
      )}

      {state === "starting" && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-[var(--ink-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Starting the camera…
        </p>
      )}

      {state === "scanning" && (
        <p className="mt-6 text-center text-sm leading-relaxed text-[var(--ink-muted)]">
          Hold the card flat, about 15 cm away, in good light. It will open by itself.
        </p>
      )}

      {state === "found" && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--teal)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Card recognised — opening your portal…
        </p>
      )}

      {state === "rejected" && (
        <Notice>
          That is a QR code, but it is not a SET admit card. Scan the code printed on your own card.
        </Notice>
      )}

      {state === "denied" && (
        <Notice>
          We could not use the camera. Allow camera access for this page in your browser settings and
          try again — or ask your exam coordinator to help you scan.
        </Notice>
      )}

      {state === "unsupported" && (
        <Notice>
          This browser cannot scan QR codes. Open your phone&apos;s camera app and point it at the
          code on your card, or ask your exam coordinator for help.
        </Notice>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-6 flex items-start gap-2.5 rounded-xl bg-[var(--maroon-tint)] px-4 py-3.5 text-sm leading-relaxed text-[#5e1420]"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
