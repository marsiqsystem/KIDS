"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Enter your Unique ID" on the /set result-day page.
 *
 * For the student who cannot scan their admit card — a cracked camera, a lost
 * card, a borrowed phone. They type the 9 digits and land on the same portal
 * the QR would have opened.
 *
 * Styled against the main site's palette (primary / surface / outline-variant),
 * not the portal's design-system tokens: this component lives on /set, which
 * runs the older site theme. Matching the portal here would look like a patch
 * from another website.
 */
export default function ResultLookup() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const digits = id.replace(/\D/g, "");
  const ready = digits.length === 9 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/result/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: digits }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }

      // Straight to their portal. `busy` deliberately stays true: the button
      // must not flick back to "Open My Result" while the next page loads.
      router.push(data.url);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md text-left">
      <label
        htmlFor="uid"
        className="mb-2 block text-xs font-semibold uppercase tracking-widest text-on-surface-variant"
      >
        Your Unique ID
      </label>

      <input
        id="uid"
        name="uid"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        // 11 allows a couple of spaces or dashes as typed; the value is
        // stripped to digits before it is used or counted.
        maxLength={11}
        placeholder="e.g. 212049705"
        value={id}
        onChange={(e) => {
          setId(e.target.value);
          if (error) setError(null);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "uid-error" : "uid-hint"}
        className="w-full rounded-lg border-2 border-outline-variant bg-white px-4 py-4 text-center font-mono text-2xl tracking-[0.15em] text-primary tabular-nums outline-none transition-colors placeholder:text-base placeholder:tracking-normal placeholder:font-sans placeholder:text-on-surface-variant/60 focus:border-primary"
      />

      {error ? (
        <p id="uid-error" role="alert" className="mt-3 text-sm leading-relaxed text-error">
          {error}
        </p>
      ) : (
        <p id="uid-hint" className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          The 9-digit number printed on your admit card.
        </p>
      )}

      <button
        type="submit"
        disabled={!ready}
        className="mt-5 w-full rounded-lg bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Opening your result…" : "Open My Result"}
      </button>
    </form>
  );
}
