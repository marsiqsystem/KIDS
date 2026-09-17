"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, Check, DoorClosed, MapPin, TimerOff, WifiOff } from "lucide-react";
import Sheet from "@/components/app/Sheet";

/**
 * Check in: point the phone at the invigilator's screen. Redesign board 04,
 * state 3 — the only dark screen in the app, because it is a camera.
 *
 * The camera is opened only when the student taps the viewfinder, never on
 * arrival — a permission prompt that appears by itself on exam morning is one a
 * nervous child denies. (The board opens it straight away; this rule predates
 * the board and wins.) The six boxes under it do exactly the same job for a
 * phone whose camera will not focus or was refused, and they are always on
 * screen, not hidden behind a failure.
 *
 * The codes rotate every thirty seconds and a scan is good for about a minute,
 * so nothing here is cached or retried later: a failed check-in is re-scanned,
 * not replayed.
 */

type Outcome =
  | { kind: "in"; centre: string; elsewhere: boolean }
  | { kind: "expired"; text: string }
  | { kind: "early"; text: string }
  | { kind: "closed" }
  | { kind: "offline" };

export default function CheckIn({ centreName }: { centreName: string }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const busy = useRef(false);
  const boxes = useRef<HTMLInputElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [denied, setDenied] = useState(false);
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [sending, setSending] = useState(false);

  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setScanning(false);
  }

  useEffect(() => stop, []);

  async function send(input: string) {
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    setOutcome(null);
    try {
      const res = await fetch("/api/app/exam/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (data.ok) {
        stop();
        setOutcome({ kind: "in", centre: data.centre ?? "", elsewhere: Boolean(data.elsewhere) });
        // The server now renders the waiting room; give the tick a moment to land.
        window.setTimeout(() => router.refresh(), 1400);
      } else if (data.reason === "over") {
        setOutcome({ kind: "closed" });
      } else if (data.reason === "too_early") {
        setOutcome({ kind: "early", text: data.message });
      } else {
        setCode("");
        setOutcome({ kind: "expired", text: data.message ?? "" });
      }
    } catch {
      setOutcome({ kind: "offline" });
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  async function startCamera() {
    setOutcome(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      stream.current = s;
      setScanning(true);
      // The element exists once scanning is true; attach on the next frame.
      requestAnimationFrame(() => {
        if (!video.current) return;
        video.current.srcObject = s;
        video.current.play().catch(() => {});
        requestAnimationFrame(tick);
      });
    } catch {
      // Refused, or no camera: straight to typing, and the camera does not
      // ask again on this visit.
      setDenied(true);
      boxes.current?.focus();
    }
  }

  function tick() {
    const v = video.current;
    if (!v || !stream.current) return;
    if (v.readyState >= 2 && !busy.current) {
      // Scanned from a small, centred square: faster on a cheap phone, and it
      // ignores a neighbour's screen at the edge of the frame.
      const side = Math.min(v.videoWidth, v.videoHeight, 640);
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, side, side);
        const found = jsQR(ctx.getImageData(0, 0, side, side).data, side, side, { inversionAttempts: "dontInvert" });
        if (found?.data?.startsWith("KIDSIN1.")) {
          send(found.data);
        }
      }
    }
    requestAnimationFrame(tick);
  }

  const digits = code.replace(/\D/g, "").slice(0, 6);

  return (
    <div className="ci">
      <div className="ci__bar">
        <span className="ci__title">Scan the desk code</span>
      </div>

      {!denied ? (
        <div className="ci__view">
          {scanning ? (
            <video ref={video} playsInline muted className="ci__video" />
          ) : null}
          <button
            type="button"
            className="ci__frame"
            onClick={scanning ? stop : startCamera}
            aria-label={scanning ? "Stop the camera" : "Open the camera"}
          >
            <span className="ci__corner ci__corner--tl" />
            <span className="ci__corner ci__corner--tr" />
            <span className="ci__corner ci__corner--bl" />
            <span className="ci__corner ci__corner--br" />
            {scanning ? (
              <span className="ci__line k-breathe" />
            ) : (
              <span className="ci__tap">
                <Camera size={30} aria-hidden="true" />
                Tap to scan
              </span>
            )}
          </button>
          <p className="ci__hint">Point your camera at the QR code on the invigilator&rsquo;s desk.</p>
        </div>
      ) : null}

      <form
        className={`ci__type${denied ? " ci__type--full" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (digits.length === 6) send(digits);
        }}
      >
        <div className="ci__or">
          <span>{denied ? "Type the code" : "Or type it"}</span>
        </div>
        <label className="ci__boxes">
          <span className="app-sr">The six digits under the code</span>
          <input
            ref={boxes}
            className="ci__input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={digits}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(next);
              if (next.length === 6) send(next);
            }}
          />
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`ci__box${i === digits.length ? " ci__box--live" : ""}`}
            >
              {digits[i] ?? ""}
            </span>
          ))}
        </label>
        <p className="ci__changes">
          <span className="ci__spinner" aria-hidden="true" />
          {sending ? "Checking…" : "The number under the QR changes every 30 seconds."}
        </p>
        {denied ? (
          <p className="k-line ci__center">
            Checking in at <strong>{centreName}</strong>
          </p>
        ) : null}
      </form>

      <Sheet open={outcome !== null} onClose={() => setOutcome(null)}>
        {outcome?.kind === "in" ? (
          <div className="ci-out ci-out--in">
            <span className="ci-out__tick">
              <Check size={30} aria-hidden="true" />
            </span>
            <p className="ci-out__title">Checked in</p>
            {outcome.elsewhere ? (
              <p className="k-line">
                You are at a different centre. That is allowed — the office is told.
              </p>
            ) : (
              <p className="k-line">{centreName}</p>
            )}
            <p className="k-line">Wait for the invigilator to start the paper.</p>
          </div>
        ) : outcome ? (
          <div className="ci-out">
            <span className={`ci-out__icon ci-out__icon--${outcome.kind}`} aria-hidden="true">
              {outcome.kind === "expired" ? (
                <TimerOff size={20} />
              ) : outcome.kind === "closed" ? (
                <DoorClosed size={20} />
              ) : outcome.kind === "early" ? (
                <MapPin size={20} />
              ) : (
                <WifiOff size={20} />
              )}
            </span>
            <div>
              <p className="k-h">
                {outcome.kind === "expired"
                  ? "That code did not work"
                  : outcome.kind === "closed"
                    ? "This paper has closed"
                    : outcome.kind === "early"
                      ? "Check-in has not opened"
                      : "No connection"}
              </p>
              <p className="k-line">
                {outcome.kind === "expired"
                  ? "The desk shows a new one every 30 seconds. Scan again."
                  : outcome.kind === "closed"
                    ? "Speak to your invigilator."
                    : outcome.kind === "early"
                      ? "The code works once your invigilator starts the desk."
                      : "Check-in needs signal for a moment. Try again."}
              </p>
            </div>
          </div>
        ) : null}
        {outcome && outcome.kind !== "in" ? (
          <button type="button" className="k-btn ci-out__again" onClick={() => setOutcome(null)}>
            Try again
          </button>
        ) : null}
      </Sheet>
    </div>
  );
}
