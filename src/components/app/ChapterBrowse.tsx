"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * The chapter list. Design 4c.
 *
 * Every row states the chapter's REAL size — "3 questions · 1 seen", "2
 * questions · done". That is the whole point of the screen: the median chapter
 * in this bank holds three questions, and a student must never tap into one
 * expecting a course. The subject header sticks and carries its own totals, and
 * a long chapter name wraps to two lines rather than truncating.
 *
 * Filtering and search run in the browser over a list the server has already
 * narrowed to this student's class. It is a few hundred rows at most, and a
 * round trip per keystroke on a school's 3G would be far worse.
 */

export interface BrowseChapter {
  key: string;
  section: string;
  chapter: string;
  total: number;
  seen: number;
  wrong: number;
  hasVideo: boolean;
  mine: boolean;
}

type Filter = "mine" | "video" | "fresh" | "weak";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "mine", label: "My subjects" },
  { id: "video", label: "Has a video" },
  { id: "fresh", label: "Not started" },
  { id: "weak", label: "Weak" },
];

export default function ChapterBrowse({ chapters }: { chapters: BrowseChapter[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<Filter>>(new Set());

  const toggle = (id: Filter) =>
    setActive((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const shown = useMemo(() => {
    // Case-insensitive and script-agnostic: `localeCompare`-style folding is
    // wrong for Bengali, so this is a plain lowercase contains, which works the
    // same for "mirror", "অম্ল" and "Damodar".
    const needle = query.trim().toLowerCase();

    return chapters.filter((c) => {
      if (needle && !c.chapter.toLowerCase().includes(needle) && !c.section.toLowerCase().includes(needle)) {
        return false;
      }
      if (active.has("mine") && !c.mine) return false;
      if (active.has("video") && !c.hasVideo) return false;
      if (active.has("fresh") && c.seen > 0) return false;
      // "Weak" is a chapter where something has actually been got wrong. Not a
      // guess from a low score on one question — a real mistake on record.
      if (active.has("weak") && c.wrong === 0) return false;
      return true;
    });
  }, [chapters, query, active]);

  // Group into sticky subject sections, preserving the server's order.
  const groups = useMemo(() => {
    const out: { section: string; rows: BrowseChapter[] }[] = [];
    for (const row of shown) {
      const last = out[out.length - 1];
      if (last && last.section === row.section) last.rows.push(row);
      else out.push({ section: row.section, rows: [row] });
    }
    return out;
  }, [shown]);

  return (
    <div className="app-browse">
      <label className="app-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m16.5 16.5 4 4" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a chapter"
          aria-label="Search a chapter"
        />
      </label>

      <div className="app-filters" role="group" aria-label="Filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`app-filter${active.has(f.id) ? " app-filter--on" : ""}`}
            onClick={() => toggle(f.id)}
            aria-pressed={active.has(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="app-hint">
          No chapter matches that. Try a shorter word, or clear the filters.
        </p>
      ) : (
        groups.map((group) => {
          const questions = group.rows.reduce((n, r) => n + r.total, 0);
          return (
            <section key={group.section} className="app-group">
              <header className="app-group__head">
                <span className="app-group__name">{group.section}</span>
                <span className="app-group__meta">
                  {group.rows.length} chapter{group.rows.length === 1 ? "" : "s"} · {questions}{" "}
                  question{questions === 1 ? "" : "s"}
                </span>
              </header>

              {group.rows.map((row) => (
                <Link key={row.key} href={`/app/learn/${row.key}`} className="app-chapter">
                  <Ring done={row.seen} of={row.total} />
                  <span className="app-chapter__body">
                    <span className="app-chapter__name">{row.chapter}</span>
                    <span className="app-chapter__meta">
                      {row.total} question{row.total === 1 ? "" : "s"} ·{" "}
                      {row.seen === 0
                        ? "not started"
                        : row.seen >= row.total
                          ? "done"
                          : `${row.seen} seen`}
                      {!row.hasVideo && " · no video yet"}
                    </span>
                  </span>
                  {row.hasVideo && (
                    <span className="app-chapter__video" aria-label="Has a video">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M7.5 4.6v14.8L19.5 12z" />
                      </svg>
                    </span>
                  )}
                  <svg className="app-chapter__go" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}

/** How much of a chapter has been seen. Empty ring for one not started. */
function Ring({ done, of }: { done: number; of: number }) {
  const r = 14;
  const circumference = 2 * Math.PI * r;
  const share = of === 0 ? 0 : Math.min(done / of, 1);

  return (
    <svg className="app-ring" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="5" className="app-ring__track" />
      {share > 0 && (
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="app-ring__fill"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - share)}
          transform="rotate(-90 18 18)"
        />
      )}
    </svg>
  );
}
