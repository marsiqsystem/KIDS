"use client";

import { useState } from "react";
import { BatteryMedium, Check, LoaderCircle, Smartphone, TriangleAlert, Wifi } from "lucide-react";

/**
 * "Is my phone ready?"
 *
 * Runs entirely in the browser -- no server, no data sent anywhere. The point is
 * to move exam-day disasters to today.
 *
 * The check that earns its place is `storage`. The exam keeps a student's
 * answers in localStorage, which is what protects them if the phone dies or the
 * browser is killed mid-paper. Private/Incognito mode blocks it, and a student
 * must discover that now rather than at 10:47 with twenty minutes of answers at
 * stake. Everything else here is supporting cast.
 */

type Status = "pass" | "warn" | "fail";

type Result = {
  key: string;
  label: string;
  status: Status;
  detail: string;
  /** Present only when the student must actually do something. */
  fix?: string;
};

type Phase = "idle" | "checking" | "done";

async function runChecks(): Promise<Result[]> {
  const results: Result[] = [];

  // 1. Browser. Anything that can run this file can run the exam; what we are
  //    really catching is an ancient WebView with no modern APIs.
  const modern =
    typeof Promise !== "undefined" &&
    typeof fetch !== "undefined" &&
    typeof Object.fromEntries === "function";
  results.push({
    key: "browser",
    label: "Browser",
    status: modern ? "pass" : "fail",
    detail: modern ? "Up to date" : "Too old to run the test",
    fix: modern
      ? undefined
      : "Update Chrome from the Play Store, or use a different phone on exam day.",
  });

  // 2. THE important one.
  let storageOk = false;
  try {
    const probe = "__kids_probe__";
    window.localStorage.setItem(probe, "1");
    storageOk = window.localStorage.getItem(probe) === "1";
    window.localStorage.removeItem(probe);
  } catch {
    storageOk = false;
  }
  results.push({
    key: "storage",
    label: "Saving your answers",
    status: storageOk ? "pass" : "fail",
    detail: storageOk ? "Working" : "Your browser can't save answers",
    fix: storageOk
      ? undefined
      : "This phone is in Private / Incognito mode, which blocks saving — and saving is what protects your answers if your phone restarts mid-test. Turn off Private mode, or open this page in a normal tab, then check again.",
  });

  // 3. Connection. Only needed to load the paper and to submit; the exam itself
  //    survives a drop. So a slow link is a warning, never a failure.
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const effective = conn?.effectiveType;
  const slow = effective === "slow-2g" || effective === "2g";
  results.push({
    key: "connection",
    label: "Connection",
    status: !online ? "fail" : slow ? "warn" : "pass",
    detail: !online ? "You are offline" : slow ? "Slow, but usable" : "Good",
    fix: !online
      ? "Turn on mobile data or join a Wi-Fi network, then check again."
      : slow
        ? "Your paper may take a little longer to load. Arrive early and open the page as soon as you reach the centre."
        : undefined,
  });

  // 4. Screen. 320px is the narrowest phone still in real use.
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  results.push({
    key: "screen",
    label: "Screen",
    status: w >= 320 ? "pass" : "warn",
    detail: w >= 320 ? "Big enough to read a question" : "Very narrow",
    fix: w >= 320 ? undefined : "Questions may be cramped. If you can, use a bigger phone.",
  });

  // 5. Battery. Chrome on Android only -- Safari and Firefox do not expose it,
  //    which is not a problem the student can fix, so we simply omit the row.
  type BatteryManager = { level: number; charging: boolean };
  const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryManager> })
    .getBattery;
  if (typeof getBattery === "function") {
    try {
      const b = await getBattery.call(navigator);
      const pct = Math.round(b.level * 100);
      const low = pct < 30 && !b.charging;
      results.push({
        key: "battery",
        label: "Battery",
        status: low ? "warn" : "pass",
        detail: `${pct}%${b.charging ? " · charging" : ""}${low ? "" : " — top it up before you go"}`,
        fix: low
          ? "Charge your phone before exam day. A 30-minute test on a nearly-flat battery is a risk you don't need."
          : undefined,
      });
    } catch {
      /* Battery is a nice-to-have; never fail the check over it. */
    }
  }

  return results;
}

export default function DeviceCheck() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<Result[]>([]);

  const start = async () => {
    setPhase("checking");
    const [checks] = await Promise.all([
      runChecks(),
      // Let the student actually see it happen. Instant results read as "it
      // didn't do anything".
      new Promise((r) => setTimeout(r, 900)),
    ]);
    setResults(checks);
    setPhase("done");
  };

  if (phase === "idle") {
    return (
      <section className="portal-card border-[rgb(30_158_140/40%)] bg-[linear-gradient(180deg,#F3FAF8,#FBF7EF)] p-5 sm:p-7">
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgb(30_158_140/14%)] sm:h-[60px] sm:w-[60px]">
            <Smartphone className="h-6 w-6 text-[var(--teal)] sm:h-7 sm:w-7" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--teal)]">
              ★ Do this today
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)] sm:text-2xl">
              Is my phone ready?
            </h2>
            <p className="mt-1 max-w-[440px] text-sm leading-relaxed text-[var(--ink-muted)]">
              One tap checks your browser, storage, connection and battery — right here, right now.
              Better to know today than at 10:47 on exam morning.
            </p>
          </div>
          <button
            onClick={start}
            className="hidden shrink-0 rounded-[10px] bg-[var(--teal)] px-7 py-4 font-semibold text-white transition hover:brightness-110 sm:block"
          >
            Check my phone
          </button>
        </div>
        <button
          onClick={start}
          className="mt-4 w-full rounded-[9px] bg-[var(--teal)] py-3.5 font-semibold text-white transition hover:brightness-110 sm:hidden"
        >
          Check my phone
        </button>
      </section>
    );
  }

  if (phase === "checking") {
    return (
      <section className="portal-card p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-[var(--teal)]" aria-hidden="true" />
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Checking your phone…
          </h2>
        </div>
        <ul className="mt-5 space-y-3 text-sm text-[var(--ink-muted)]">
          {["Browser", "Saving your answers", "Connection", "Screen & battery"].map((label) => (
            <li key={label} className="flex items-center gap-2.5">
              <span className="h-4 w-4 rounded-full border-2 border-[var(--cream-muted)]" />
              {label}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const problems = results.filter((r) => r.status !== "pass");
  const blocking = results.some((r) => r.status === "fail");

  // All clear.
  if (!problems.length) {
    return (
      <section className="portal-card overflow-hidden border-[rgb(30_158_140/50%)] p-0">
        <div className="bg-[linear-gradient(160deg,#1E9E8C,#0C6B5F)] p-6 text-center">
          <span className="inline-flex h-13 w-13 items-center justify-center rounded-full bg-white/20 p-3.5">
            <Check className="h-7 w-7 text-white" strokeWidth={2.6} aria-hidden="true" />
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-white">
            Your phone is ready
          </h2>
          <p className="mt-1 text-sm text-[#d3f0e9]">Everything the test needs is working.</p>
        </div>
        <ResultList results={results} />
      </section>
    );
  }

  // Something to fix. Lead with the single most important problem.
  const [first] = problems;
  return (
    <section className="portal-card overflow-hidden border-[rgb(201_162_75/60%)] p-0">
      <div className="bg-[image:var(--gradient-maroon)] px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(229_190_122/20%)]">
            <TriangleAlert className="h-6 w-6 text-[var(--gold-light)]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--cream)]">
              {problems.length === 1 ? "One thing to fix" : `${problems.length} things to fix`}
            </h2>
            <p className="text-xs text-[#e7cfc4]">
              {blocking ? "Please sort this before exam day." : "Everything else is fine."}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="font-semibold text-[var(--maroon)]">{first.detail}</div>
        {first.fix && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{first.fix}</p>
        )}

        {problems.length > 1 && (
          <ul className="mt-4 space-y-2 border-t border-[var(--cream-muted)] pt-4">
            {problems.slice(1).map((p) => (
              <li key={p.key} className="text-sm text-[var(--ink-muted)]">
                <strong className="text-[var(--ink)]">{p.label}:</strong> {p.detail}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={start}
          className="mt-5 w-full rounded-[9px] bg-[var(--maroon)] py-3 font-semibold text-[var(--cream)] transition hover:brightness-110"
        >
          Check again
        </button>
      </div>
    </section>
  );
}

function ResultList({ results }: { results: Result[] }) {
  const icon = { connection: Wifi, battery: BatteryMedium } as const;

  return (
    <ul className="space-y-3 p-5 sm:p-6">
      {results.map((r) => {
        const Icon = icon[r.key as keyof typeof icon] ?? Check;
        return (
          <li key={r.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Icon className="h-4 w-4 text-[var(--teal)]" strokeWidth={2.4} aria-hidden="true" />
              {r.label}
            </span>
            <span className="text-right text-[var(--ink-muted)]">{r.detail}</span>
          </li>
        );
      })}
    </ul>
  );
}
