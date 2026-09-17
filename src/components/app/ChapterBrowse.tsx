"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Play, Search } from "lucide-react";
import { subjectHue, subjectInitials } from "@/lib/app/subjects";

/**
 * Learn. Redesign board 07, 2A–2B, with the brief's search and four filters.
 *
 * On top, the student's subjects as rings — chapters touched of chapters there
 * are, which is a measure of what has been SEEN, never of mastery. Subjects not
 * chosen stay visible, dashed, with what adding them would bring.
 *
 * Below, every chapter of the class and stream, grouped under a subject header
 * in its colour. Each row states the chapter's REAL size — "2 of 3 seen" — so
 * the library never looks bigger than it is. Search and filters run in the
 * browser over a list the server has already narrowed; a round trip per
 * keystroke on 3G would be far worse.
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
  const [subject, setSubject] = useState<string | null>(null);

  const toggle = (id: Filter) =>
    setActive((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const subjects = useMemo(() => {
    const out = new Map<string, { section: string; chapters: number; touched: number; questions: number; unseen: number; videos: number; mine: boolean }>();
    for (const c of chapters) {
      const s = out.get(c.section) ?? { section: c.section, chapters: 0, touched: 0, questions: 0, unseen: 0, videos: 0, mine: c.mine };
      s.chapters += 1;
      s.touched += c.seen > 0 ? 1 : 0;
      s.questions += c.total;
      s.unseen += c.total - c.seen;
      s.videos += c.hasVideo ? 1 : 0;
      out.set(c.section, s);
    }
    const all = [...out.values()];
    return [...all.filter((s) => s.mine), ...all.filter((s) => !s.mine)];
  }, [chapters]);

  const shown = useMemo(() => {
    // A plain lowercase contains: locale folding is wrong for Bengali, and this
    // works the same for "mirror", "অম্ল" and "Damodar".
    const needle = query.trim().toLowerCase();
    return chapters.filter((c) => {
      if (subject && c.section !== subject) return false;
      if (needle && !c.chapter.toLowerCase().includes(needle) && !c.section.toLowerCase().includes(needle)) return false;
      if (active.has("mine") && !c.mine) return false;
      if (active.has("video") && !c.hasVideo) return false;
      if (active.has("fresh") && c.seen > 0) return false;
      // A chapter where something has actually been got wrong — a real mistake
      // on record, not a guess from one low score.
      if (active.has("weak") && c.wrong === 0) return false;
      return true;
    });
  }, [chapters, query, active, subject]);

  const groups = useMemo(() => {
    const out: { section: string; rows: BrowseChapter[] }[] = [];
    for (const row of shown) {
      const last = out[out.length - 1];
      if (last && last.section === row.section) last.rows.push(row);
      else out.push({ section: row.section, rows: [row] });
    }
    return out;
  }, [shown]);

  const mine = subjects.filter((s) => s.mine);
  const others = subjects.filter((s) => !s.mine);

  return (
    <div className="lrn">
      {!subject && !query && active.size === 0 ? (
        <div className="lrn-subjects">
          {mine.length > 0 ? (
            <div className="k-label lrn-subjects__title">
              My subjects <span>{mine.length}</span>
            </div>
          ) : null}
          {mine.map((s) => (
            <button
              key={s.section}
              type="button"
              className="k-row lrn-subject"
              style={{ "--hue": subjectHue(s.section) } as React.CSSProperties}
              onClick={() => setSubject(s.section)}
            >
              <span
                className="k-ring k-ring--small"
                style={
                  {
                    "--pct": `${s.chapters ? Math.round((s.touched / s.chapters) * 100) : 0}%`,
                    "--fill": "var(--hue)",
                  } as React.CSSProperties
                }
                aria-hidden="true"
              >
                <span className="k-ring__hole">
                  <span className="k-ring__n">
                    {s.touched}/{s.chapters}
                  </span>
                </span>
              </span>
              <span className="k-row__text">
                <span className="k-row__title">{s.section}</span>
                <span className="k-row__line">
                  {s.touched === s.chapters
                    ? `All ${s.chapters} chapters seen`
                    : `${s.chapters} chapters · ${s.videos} videos`}
                </span>
              </span>
              <ChevronRight size={18} className="k-row__chev" aria-hidden="true" />
            </button>
          ))}

          {others.length > 0 ? <div className="k-label lrn-subjects__title">Not chosen</div> : null}
          {others.map((s) => (
            <button
              key={s.section}
              type="button"
              className="k-row lrn-subject lrn-subject--off"
              style={{ "--hue": subjectHue(s.section) } as React.CSSProperties}
              onClick={() => setSubject(s.section)}
            >
              <span className="lrn-subject__badge" aria-hidden="true">
                {subjectInitials(s.section)}
              </span>
              <span className="k-row__text">
                <span className="k-row__title">{s.section}</span>
                <span className="k-row__line">
                  {s.chapters} chapters · {s.questions} questions
                </span>
              </span>
              {s.unseen > 0 ? <span className="k-chip k-chip--new">+{s.unseen}</span> : null}
            </button>
          ))}

          <Link href="/app/subjects" className="k-btn k-btn--outline">
            Change my subjects
          </Link>
        </div>
      ) : null}

      <label className="door-search lrn-search">
        <Search size={20} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a chapter"
          aria-label="Search a chapter"
        />
      </label>

      <div className="lrn-filters" role="group" aria-label="Filters">
        {subject ? (
          <button
            type="button"
            className="lrn-filter lrn-filter--on lrn-filter--subject"
            style={{ "--hue": subjectHue(subject) } as React.CSSProperties}
            onClick={() => setSubject(null)}
            aria-label={`${subject}, tap to show every subject`}
          >
            {subject} ✕
          </button>
        ) : null}
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`lrn-filter${active.has(f.id) ? " lrn-filter--on" : ""}`}
            onClick={() => toggle(f.id)}
            aria-pressed={active.has(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="k-line lrn-none">Nothing matches. Clear a filter.</p>
      ) : (
        groups.map((group) => {
          const hue = subjectHue(group.section);
          const touched = group.rows.filter((r) => r.seen > 0).length;
          return (
            <section key={group.section} className="lrn-group" style={{ "--hue": hue } as React.CSSProperties}>
              <header className="lrn-group__head">
                <span className="lrn-group__name">{group.section}</span>
                <span className="lrn-group__meta">
                  {touched} of {group.rows.length} chapters seen
                </span>
              </header>

              {group.rows.map((row) => (
                <Link
                  key={row.key}
                  href={`/app/learn/${row.key}`}
                  className={`lrn-chapter${row.seen > 0 ? " lrn-chapter--touched" : ""}`}
                >
                  <span className="lrn-chapter__body">
                    <span className="lrn-chapter__name">{row.chapter}</span>
                    <span className="lrn-chapter__meta">
                      {row.seen === 0
                        ? `${row.total} question${row.total === 1 ? "" : "s"}`
                        : `${row.seen} of ${row.total} seen`}
                      {row.hasVideo ? (
                        <span className="lrn-video">
                          <Play size={11} fill="currentColor" aria-hidden="true" /> Video
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {row.wrong > 0 ? <span className="k-chip k-chip--again">Weak</span> : null}
                  {row.seen === 0 ? <span className="k-chip k-chip--new">New</span> : null}
                  <ChevronRight size={18} className="lrn-chapter__go" aria-hidden="true" />
                </Link>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
