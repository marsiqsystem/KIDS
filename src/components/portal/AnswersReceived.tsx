import { Check, ShieldCheck, FileText } from "lucide-react";

/**
 * "Your answers are in" — the screen a student sees the instant they submit, and
 * again if they re-open the portal before results are published.
 *
 * It shows ONLY what was received: how many questions were answered, how many
 * were left blank, and a grid of the sheet. Deliberately NO score — marking is
 * assessed by hand and published later, on a separate results page that does not
 * exist yet. Implying an instant result here would be a lie to a child.
 *
 * Pure/presentational: no hooks, so it renders in a Server Component (the portal)
 * and inside the Client exam component alike. Both compute `filled` from the
 * answer sheet they already hold.
 */

/** A time as a student reads it — "10:52 AM", always in IST, whatever the server's zone. */
export function formatIstClock(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
}

export default function AnswersReceived({
  name,
  classLabel,
  receivedAtIso,
  deadlineAtIso,
  filled,
  timedOut,
}: {
  name: string;
  classLabel: string;
  /** When the submission landed. */
  receivedAtIso: string;
  /** The hard deadline, to work out how much time was left. */
  deadlineAtIso: string;
  /** One flag per question, in order: true = answered, false = left blank. */
  filled: boolean[];
  /** The clock ran out and we submitted for them, rather than they pressed Submit. */
  timedOut: boolean;
}) {
  const total = filled.length;
  const answered = filled.filter(Boolean).length;
  const blank = total - answered;

  const received = formatIstClock(receivedAtIso);
  const spareMin = Math.max(
    0,
    Math.floor((new Date(deadlineAtIso).getTime() - new Date(receivedAtIso).getTime()) / 60_000),
  );

  return (
    <div className="portal flex min-h-screen flex-col bg-[var(--cream)]">
      {/* ---------------------------------------------------------- hero --- */}
      <div className="sky px-6 pb-9 pt-10 text-center sm:pb-11">
        <div className="stars" aria-hidden="true" />
        <div className="relative mx-auto max-w-xl">
          <span className="inline-flex h-[74px] w-[74px] items-center justify-center rounded-full bg-[var(--gold)] shadow-[0_0_0_8px_rgb(201_162_75/18%)]">
            <Check className="h-9 w-9 text-[var(--maroon-deep)]" strokeWidth={2.6} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-[2.1rem] font-bold leading-tight text-[var(--cream)] sm:text-[2.7rem]">
            Your answers are in
          </h1>
          <p className="mx-auto mt-2.5 max-w-md leading-relaxed text-[#d8e6e2] sm:text-lg">
            {timedOut ? (
              <>
                Time is up — your answers were submitted for you at{" "}
                <span className="tnum">{received}</span>. Nothing is lost, {name}.
              </>
            ) : (
              <>
                Received at <span className="tnum">{received}</span>
                {spareMin > 0 && (
                  <>
                    , with <span className="tnum">{spareMin} minute{spareMin === 1 ? "" : "s"}</span> to
                    spare
                  </>
                )}
                . Well done, {name}.
              </>
            )}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------- body --- */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3.5 px-4 pb-10 pt-4 sm:px-6">
        {/* what we received */}
        <section className="portal-card p-4 sm:p-5">
          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">What we received</h2>
            <span className="text-xs text-[var(--ink-muted)]">Class {classLabel}</span>
          </div>

          <div className="mb-3.5 flex gap-2.5">
            <div className="flex-1 rounded-xl bg-[var(--maroon-tint)] px-3.5 py-3">
              <div className="tnum font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-[var(--maroon)]">
                {answered}
                <span className="text-base font-semibold text-[var(--ink-muted)]">/{total}</span>
              </div>
              <div className="lbl mt-1.5">Answered</div>
            </div>
            <div className="flex-1 rounded-xl border border-[var(--cream-muted)] bg-[var(--cream-surface)] px-3.5 py-3">
              <div className="tnum font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-[var(--ink)]">
                {blank}
              </div>
              <div className="lbl mt-1.5">Left blank</div>
            </div>
          </div>

          {/* the sheet */}
          <div className="grid grid-cols-10 gap-1.5 lg:grid-cols-[repeat(25,minmax(0,1fr))]">
            {filled.map((on, i) => (
              <span
                key={i}
                className={`aspect-square rounded-[4px] ${
                  on ? "bg-[var(--maroon)]" : "border-[1.5px] border-[var(--cream-muted)] bg-white"
                }`}
              />
            ))}
          </div>

          <div className="mt-3 flex gap-4 text-xs text-[var(--ink-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] bg-[var(--maroon)]" />
              Answered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px] border-[1.5px] border-[var(--cream-muted)] bg-white" />
              Blank
            </span>
          </div>
        </section>

        {/* locked and safe */}
        <div className="flex items-start gap-3 rounded-xl bg-[rgb(30_158_140/10%)] px-3.5 py-3.5">
          <ShieldCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--teal)]" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-[#0d5248]">
            <strong className="font-bold">Locked and safe.</strong> Your answers are stored on our
            server. Closing this page will not change anything.
          </p>
        </div>

        {/* next step */}
        <section className="portal-card flex items-start gap-3.5 p-4 sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--maroon-tint)]">
            <FileText className="h-5 w-5 text-[var(--maroon)]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Next: the written test
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
              Begins at <strong className="tnum text-[var(--ink)]">11:30 AM</strong> in your room. Hand
              your phone to the invigilator when asked.
            </p>
          </div>
        </section>

        <p className="pb-2 pt-1 text-center text-xs leading-relaxed text-[var(--ink-muted)]">
          Your result will appear on this same page. You can close it now.
        </p>
      </div>
    </div>
  );
}
