import type { AwardResult, LaterResult } from "@/lib/exam/later-results";

const n = (x: number) => x.toLocaleString("en-IN");
const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 10) / 10}`);

/**
 * Every result after July, and the SET 2026 award, above the July result.
 *
 * Nothing renders until something is published: for most of the year this
 * component is nothing at all, and July's page is exactly what it was.
 *
 * The award card says what it is made of. A child who sat only one phase is told
 * so, in words, rather than shown a number that looks like the same kind of
 * number as a classmate's two-phase average.
 */
export default function LaterResults({
  results,
  award,
}: {
  results: LaterResult[];
  award: AwardResult | null;
}) {
  if (!results.length && !award) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3.5 px-4 pt-4 sm:px-6">
      {award ? <AwardCard a={award} /> : null}
      {results.map((r, i) => (
        <PaperCard key={`${r.paper_name}-${i}`} r={r} />
      ))}
    </div>
  );
}

function AwardCard({ a }: { a: AwardResult }) {
  return (
    <section className="portal-card p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{a.series_name} · your award mark</h2>
        <span className="text-xs text-[var(--ink-muted)]">Class {a.cohort}</span>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="tnum font-[family-name:var(--font-display)] text-4xl font-bold leading-none text-[var(--maroon)]">
            {pct(a.award_percent)}
            <span className="text-base font-semibold text-[var(--ink-muted)]">/100</span>
          </div>
          <div className="lbl mt-1.5">
            {a.phases === 2 ? "Average of Phase 1 and Phase 2" : "From the one phase you sat"}
          </div>
        </div>
        {a.ranked && a.rank !== null ? (
          <div>
            <div className="tnum font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-[var(--ink)]">
              {n(a.rank)}
              <span className="text-base font-semibold text-[var(--ink-muted)]"> of {n(a.cohort_size)}</span>
            </div>
            <div className="lbl mt-1.5">
              {a.list === "one" ? "Among students who sat one phase" : a.list === "both" ? "Among students who sat both phases" : `In Class ${a.cohort}`}
            </div>
          </div>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
        <div className="rounded-xl border border-[var(--cream-muted)] bg-[var(--cream-surface)] px-3.5 py-2.5">
          <dt className="lbl">Phase 1 · July, written paper</dt>
          <dd className="tnum mt-1 font-semibold">{a.phase1_percent === null ? "Not sat" : `${pct(a.phase1_percent)} / 100`}</dd>
        </div>
        <div className="rounded-xl border border-[var(--cream-muted)] bg-[var(--cream-surface)] px-3.5 py-2.5">
          <dt className="lbl">Phase 2 · December, in the app</dt>
          <dd className="tnum mt-1 font-semibold">{a.phase2_percent === null ? "Not sat" : `${pct(a.phase2_percent)} / 100`}</dd>
        </div>
      </dl>
    </section>
  );
}

function PaperCard({ r }: { r: LaterResult }) {
  return (
    <section className="portal-card p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{r.paper_name}</h2>
        <span className="text-xs text-[var(--ink-muted)]">
          {r.kind === "mock" ? "Mock · not counted anywhere" : `Class ${r.cohort}`}
        </span>
      </div>

      <div className="mb-3 flex gap-2.5">
        <div className="flex-1 rounded-xl bg-[var(--maroon-tint)] px-3.5 py-3">
          <div className="tnum font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-[var(--maroon)]">
            {r.marks}
            <span className="text-base font-semibold text-[var(--ink-muted)]">/{r.question_count}</span>
          </div>
          <div className="lbl mt-1.5">Marks</div>
        </div>
        {r.ranked && r.cohort_rank !== null ? (
          <div className="flex-1 rounded-xl border border-[var(--cream-muted)] bg-[var(--cream-surface)] px-3.5 py-3">
            <div className="tnum font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-[var(--ink)]">
              {n(r.cohort_rank)}
              <span className="text-base font-semibold text-[var(--ink-muted)]"> of {n(r.cohort_sat)}</span>
            </div>
            <div className="lbl mt-1.5">Rank in Class {r.cohort}</div>
          </div>
        ) : null}
      </div>

      <p className="tnum text-sm text-[var(--ink-muted)]">
        {r.correct} correct · {r.wrong} wrong · {r.blank} left blank
        {r.cohort_avg !== null ? ` · class average ${pct(r.cohort_avg)}` : ""}
        {r.cohort_high !== null ? ` · highest ${r.cohort_high}` : ""}
      </p>
      {r.timed_out ? (
        <p className="mt-1 text-xs text-[var(--ink-muted)]">Submitted automatically when time ran out.</p>
      ) : null}
      {r.receipt ? (
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Receipt <span className="font-mono">{r.receipt}</span>
        </p>
      ) : null}
    </section>
  );
}
