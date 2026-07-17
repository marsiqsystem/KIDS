"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleAlert, ImageUp, Loader2, ScanLine, ScanSearch } from "lucide-react";

/**
 * The QR scanner, for students whose phone camera cannot scan a QR code itself.
 *
 * Most Android camera apps and every iPhone can already do this; the cheapest
 * handsets cannot, and their owners are exactly the students who can least
 * afford to be locked out. This page is that fallback.
 *
 * WORKS ON EVERY PHONE — three decode paths, tried in order of quality:
 *   1. Live camera + BarcodeDetector  (Android Chrome: native, fastest)
 *   2. Live camera + jsQR             (iOS Safari, Firefox, anything else)
 *   3. A single photo from the phone's OWN camera app, decoded with jsQR
 *      (the universal safety net — needs no getUserMedia at all, so it works
 *      even where the in-page camera is blocked, and on the oldest handsets)
 * The earlier bug: the page checked for BarcodeDetector BEFORE asking for the
 * camera, so every iPhone/Firefox was told "unsupported" and never even saw a
 * permission prompt. We now request the camera first and pick a decoder after.
 *
 * SECURITY: a scanner that opens whatever URL it decodes is a phishing gadget —
 * print a poster with a malicious QR, tape it to a wall at the centre, and a
 * child hands over their session. So we never navigate to the scanned URL. We
 * pull the id and token out of it, check they are the right shape, and navigate
 * to OUR OWN /portal. Anything that is not a kidskolkata.org portal link is
 * refused out loud. This holds for the photo path too — the same readCard()
 * gate stands in front of every route we make.
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
type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): Detector;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

/** A single function that reads one frame/image and returns the decoded text. */
type Decode = (source: HTMLVideoElement | HTMLCanvasElement) => Promise<string | null>;

/**
 * Choose the best decoder this browser can offer. BarcodeDetector where it
 * genuinely supports QR (Android Chrome); otherwise jsQR, loaded on demand so
 * phones that never need it don't pay for the download.
 */
async function makeDecoder(): Promise<Decode> {
  if (typeof window !== "undefined" && window.BarcodeDetector) {
    try {
      const formats = (await window.BarcodeDetector.getSupportedFormats?.()) ?? [];
      if (formats.includes("qr_code")) {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        return async (source) => {
          const codes = await detector.detect(source);
          return codes[0]?.rawValue ?? null;
        };
      }
    } catch {
      // fall through to jsQR
    }
  }

  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return async (source) => {
    const w = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const h = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
    if (!w || !h || !ctx) return null;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(source, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const result = jsQR(data, w, h, { inversionAttempts: "attemptBoth" });
    return result?.data ?? null;
  };
}

/** Decode one still photo the student took with their own camera app. */
async function decodePhoto(file: File): Promise<string | null> {
  const bitmap = await loadBitmap(file);
  // Cap the working size: a 12-megapixel photo on a cheap phone can exhaust
  // memory in getImageData, and a QR survives being scaled down.
  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ("close" in bitmap) bitmap.close();
  const decode = await makeDecoder();
  return decode(canvas);
}

/** ImageBitmap where supported, else an <img> — old Safari lacks createImageBitmap. */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type State =
  | "idle"
  | "starting"
  | "scanning"
  | "denied"
  | "no-camera"
  | "rejected"
  | "decoding"
  | "photo-failed"
  | "found";

/**
 * Google Lens on Android, best-effort. There is no reliable web link that opens
 * Lens' live camera on an arbitrary phone (lens.google.com is a marketing page,
 * /scan 404s), so this fires the Android intent and lets the OS fall back if
 * Lens isn't installed. It is an EXTRA escape hatch — the "Take a photo" button
 * is the guaranteed universal path, and it lives right beside this one.
 */
const LENS_INTENT =
  "intent://#Intent;action=android.intent.action.VIEW;package=com.google.android.googlequicksearchbox;S.browser_fallback_url=https%3A%2F%2Flens.google%2F;end";

export default function QrScanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const loop = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>("idle");
  // Only offer the Google Lens button where Lens can actually exist. Not a
  // security decision — just avoids a dead button on an iPhone. Lazy init (not
  // an effect) so it never fights hydration: it is read only in error states,
  // which never render on the first paint.
  const [isAndroid] = useState(
    () => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent),
  );

  const stop = useCallback(() => {
    if (loop.current !== null) {
      clearInterval(loop.current);
      loop.current = null;
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  // The camera must be released when the student leaves, or the light stays on
  // and the battery they need for the exam drains in their pocket.
  useEffect(() => stop, [stop]);

  const goToPortal = useCallback(
    (card: Found) => {
      stop();
      setState("found");
      router.push(`/portal?id=${card.uid}&t=${encodeURIComponent(card.token)}`);
    },
    [router, stop],
  );

  const scan = useCallback(async () => {
    setState("starting");

    // Ask for the camera FIRST — this is what shows the permission prompt, and
    // it must happen on every browser, not only the ones with BarcodeDetector.
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch (err) {
      // Permission refused vs. no camera / getUserMedia missing — different
      // advice, different next step.
      const name = err instanceof DOMException ? err.name : "";
      setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "no-camera");
      return;
    }

    const el = video.current;
    if (!el) return;
    el.srcObject = stream.current;
    await el.play().catch(() => {});

    let decode: Decode;
    try {
      decode = await makeDecoder();
    } catch {
      // Live camera works but no decoder could load — the photo path still can.
      stop();
      setState("no-camera");
      return;
    }

    setState("scanning");

    // Four looks a second. A tight loop would cook a cheap phone and eat the
    // battery it needs to last until 11:00.
    loop.current = window.setInterval(async () => {
      const el = video.current;
      if (!el || el.readyState < 2) return;

      let raw: string | null = null;
      try {
        raw = await decode(el);
      } catch {
        return; // a dropped frame is not an error
      }
      if (!raw) return;

      const card = readCard(raw, window.location.origin);
      if (card) {
        goToPortal(card);
        return;
      }
      // A QR code, but not an admit card. Say so — do not follow it.
      setState("rejected");
    }, 250);
  }, [goToPortal, stop]);

  const onPhoto = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = ""; // let the same file be re-picked after a failure
      if (!file) return;

      stop();
      setState("decoding");
      let raw: string | null = null;
      try {
        raw = await decodePhoto(file);
      } catch {
        raw = null;
      }
      const card = raw ? readCard(raw, window.location.origin) : null;
      setState(card ? "found" : "photo-failed");
      if (card) router.push(`/portal?id=${card.uid}&t=${encodeURIComponent(card.token)}`);
    },
    [router, stop],
  );

  const showVideo = state === "scanning" || state === "rejected";
  const showPlaceholder = !showVideo && state !== "found" && state !== "decoding";

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      {/* Always present: the phone's own camera app. Works with no getUserMedia. */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPhoto}
        className="hidden"
      />

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--cream-muted)] bg-[var(--maroon-deep)]">
        <video
          ref={video}
          playsInline
          muted
          className={`h-full w-full object-cover ${showVideo ? "" : "hidden"}`}
        />

        {showVideo && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="h-3/5 w-3/5 rounded-2xl border-4 border-[var(--gold)] shadow-[0_0_0_100vmax_rgb(61_10_16/45%)]" />
          </div>
        )}

        {showPlaceholder && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <ScanLine className="h-12 w-12 text-[var(--gold-light)]" aria-hidden="true" />
            <p className="mt-4 text-sm leading-relaxed text-[#d8e6e2]">
              Point your camera at the QR code printed on your admit card.
            </p>
          </div>
        )}

        {(state === "found" || state === "decoding") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--gold-light)]" aria-hidden="true" />
            <p className="mt-4 text-sm leading-relaxed text-[#d8e6e2]">
              {state === "found" ? "Card recognised — opening your portal…" : "Reading your photo…"}
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
        <>
          <p className="mt-6 text-center text-sm leading-relaxed text-[var(--ink-muted)]">
            Hold the card flat, about 15 cm away, in good light. It will open by itself.
          </p>
          <PhotoButton onClick={() => fileInput.current?.click()} subtle />
        </>
      )}

      {state === "rejected" && (
        <>
          <Notice>
            That is a QR code, but it is not a SET admit card. Scan the code printed on your own card.
          </Notice>
          <PhotoButton onClick={() => fileInput.current?.click()} subtle />
        </>
      )}

      {state === "photo-failed" && (
        <>
          <Notice>
            We could not read a QR code in that photo. Take another with the code held flat and filling
            the frame, in good light.
          </Notice>
          <Recovery
            onRetryCamera={scan}
            onPhoto={() => fileInput.current?.click()}
            isAndroid={isAndroid}
          />
        </>
      )}

      {state === "denied" && (
        <>
          <Notice>
            We could not use the camera. Allow camera access for this page in your browser settings and
            tap “Try the camera again” — or take a photo of the code instead.
          </Notice>
          <Recovery
            onRetryCamera={scan}
            onPhoto={() => fileInput.current?.click()}
            isAndroid={isAndroid}
          />
        </>
      )}

      {state === "no-camera" && (
        <>
          <Notice>
            This browser could not open the camera for scanning. You can still take a photo of the QR
            code with your phone’s camera, and we’ll read it here.
          </Notice>
          <Recovery
            onRetryCamera={scan}
            onPhoto={() => fileInput.current?.click()}
            isAndroid={isAndroid}
          />
        </>
      )}
    </div>
  );
}

/** The universal safety net: open the phone's own camera app and photograph the code. */
function PhotoButton({ onClick, subtle = false }: { onClick: () => void; subtle?: boolean }) {
  if (subtle) {
    return (
      <button
        onClick={onClick}
        className="mx-auto mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--maroon)] underline underline-offset-4"
      >
        <ImageUp className="h-4 w-4" aria-hidden="true" />
        Not working? Take a photo instead
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--maroon)] py-4 text-lg font-semibold text-[var(--cream)] transition hover:brightness-110"
    >
      <ImageUp className="h-5 w-5" aria-hidden="true" />
      Take a photo of the QR code
    </button>
  );
}

/** The full recovery panel shown on every failure — always a next step, never a dead end. */
function Recovery({
  onRetryCamera,
  onPhoto,
  isAndroid,
}: {
  onRetryCamera: () => void;
  onPhoto: () => void;
  isAndroid: boolean;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <PhotoButton onClick={onPhoto} />
      {isAndroid && (
        <a
          href={LENS_INTENT}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--maroon)] py-3.5 text-base font-semibold text-[var(--maroon)] transition hover:bg-[var(--maroon-tint)]"
        >
          <ScanSearch className="h-5 w-5" aria-hidden="true" />
          Open Google Lens
        </a>
      )}
      <button
        onClick={onRetryCamera}
        className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-[var(--ink-muted)] underline underline-offset-4"
      >
        Try the camera again
      </button>
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
