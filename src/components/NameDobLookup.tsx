"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Lost your Unique ID too?" — the second way in on /set.
 *
 * The first four letters of the name, then the date of birth as eight digits:
 * `moha28032004`. One box rather than two, because that is how the instruction
 * reads out loud over a phone line to a parent, and a single field cannot be
 * filled in the wrong order.
 *
 * Styled against the main site's palette, matching ResultLookup directly above
 * it — /set runs the older site theme, and the portal's tokens would look like
 * a patch from another website.
 */
export default function NameDobLookup() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cleaned = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const ready = /^[a-z]{4}\d{8}$/.test(cleaned) && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/result/lookup-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: cleaned }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      // `busy` deliberately stays true: the button must not flick back to
      // "Open My Result" while the next page loads.
      router.push(data.url);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md text-left">
      <label
        htmlFor="namedob"
        className="mb-2 block text-xs font-semibold uppercase tracking-widest text-on-surface-variant"
      >
        Name &amp; Date of Birth
      </label>

      <input
        id="namedob"
        name="namedob"
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        placeholder="e.g. moha28032004"
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          if (error) setError(null);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "namedob-error" : "namedob-hint"}
        className="w-full rounded-lg border-2 border-outline-variant bg-white px-4 py-4 text-center font-mono text-xl tracking-[0.1em] text-primary outline-none transition-colors placeholder:text-base placeholder:font-sans placeholder:tracking-normal placeholder:text-on-surface-variant/60 focus:border-primary"
      />

      {error ? (
        <p id="namedob-error" role="alert" className="mt-3 text-sm leading-relaxed text-error">
          {error}
        </p>
      ) : (
        <div id="namedob-hint" className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          <p className="mb-2">
            Type it as one word, with no spaces: the{" "}
            <strong className="text-on-surface">first four letters of your name</strong> exactly as
            printed on the admit card, then your{" "}
            <strong className="text-on-surface">date of birth as eight digits</strong> — day, month,
            year.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              Mohammad Arif, born 28 March 2004 &rarr;{" "}
              <span className="font-mono text-on-surface">moha28032004</span>
            </li>
            <li>
              Sk. Imran Ali, born 5 January 2011 &rarr;{" "}
              <span className="font-mono text-on-surface">skim05012011</span> &mdash; punctuation and
              spaces are ignored, so <em>Sk.</em> counts as <em>sk</em>
            </li>
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={!ready}
        className="mt-5 w-full rounded-lg border-2 border-primary px-8 py-4 text-sm font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Opening your result…" : "Find My Result"}
      </button>
    </form>
  );
}
