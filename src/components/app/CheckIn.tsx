"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

/**
 * Check in: point the phone at the invigilator's screen.
 *
 * The camera is opened only when the student taps, never on arrival -- a
 * permission prompt that appears by itself on exam morning is one a nervous
 * child denies. The six digits under the code do exactly the same job for a
 * phone whose camera will not focus or was refused, and they are always on
 * screen, not hidden behind a failure.
 *
 * The codes rotate every thirty seconds and a scan is good for about a minute,
 * so nothing here is cached or retried later: a failed check-in is re-scanned,
 * not replayed.
 */
export default function CheckIn({ paperName, centreName }: { paperName: string; centreName: string }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const busy = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
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
    setMessage(null);
    try {
      const res = await fetch("/api/app/exam/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (data.ok) {
        stop();
        setMessage({
          ok: true,
          text: data.elsewhere
            ? `Checked in at ${data.centre}. That is not the centre on your record — tell your invigilator.`
            : "Checked in. You can start when the paper opens.",
        });
        router.refresh();
      } else {
        setMessage({ ok: false, text: data.message ?? "That did not work. Scan again." });
      }
    } catch {
      setMessage({ ok: false, text: "No connection. Check-in needs the internet for a moment — try again." });
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  async function startCamera() {
    setMessage(null);
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
      setMessage({
        ok: false,
        text: "The camera could not be opened. Type the six digits under the code instead.",
      });
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

  return (
    <div className="app-body" style={{ padding: 0 }}>
      <div className="app-card app-card--gold">
        <h3>Check in to start</h3>
        <p>
          {paperName} · {centreName}. Scan the code on your invigilator&rsquo;s screen. The paper will not
          open until you do.
        </p>
      </div>

      {scanning ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000" }}>
          <video ref={video} playsInline muted style={{ width: "100%", display: "block", aspectRatio: "1 / 1", objectFit: "cover" }} />
          <div
            aria-hidden
            style={{ position: "absolute", inset: "14%", border: "3px solid rgba(255,255,255,.85)", borderRadius: 12 }}
          />
        </div>
      ) : null}

      {scanning ? (
        <button type="button" className="app-btn app-btn--outline" onClick={stop}>
          Stop the camera
        </button>
      ) : (
        <button type="button" className="app-btn" onClick={startCamera} disabled={sending}>
          Scan the code
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(code);
        }}
        className="app-field"
      >
        <label className="app-label" htmlFor="checkin-code">
          Or type the six digits under the code
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="checkin-code"
            className="app-input"
            inputMode="numeric"
            autoComplete="off"
            maxLength={7}
            placeholder="123 456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
            style={{ fontFamily: "var(--font-data)", letterSpacing: "0.12em", fontSize: 20 }}
          />
          <button type="submit" className="app-btn app-btn--small" disabled={sending || code.replace(/\s/g, "").length !== 6}>
            {sending ? "…" : "Check in"}
          </button>
        </div>
        <span className="app-hint">The number changes every 30 seconds. Type the one showing now.</span>
      </form>

      {message ? (
        <div className={`app-card${message.ok ? " app-card--cream" : ""}`} role="status">
          <p style={{ margin: 0 }}>{message.text}</p>
        </div>
      ) : null}
    </div>
  );
}
