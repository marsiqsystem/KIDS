import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Bell, Flame } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The redesign's small parts, shared by every tab. Server components — nothing
 * here needs the browser. The bottom sheet, which does, lives in Sheet.tsx.
 */

/** The maroon header Home opens on: a line, a name, chips, and the bell. */
export function Hero({
  eyebrow,
  title,
  chips,
  unread,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  chips?: { label: string; gold?: boolean }[];
  /** Pass a number to show the notice bell; omit it to leave the bell out. */
  unread?: number;
  children?: ReactNode;
}) {
  return (
    <header className="k-hero">
      <Image src="/kids-icon.png" alt="" width={112} height={112} className="k-hero__crest" aria-hidden="true" />
      <div className="k-hero__row">
        <div className="k-hero__main">
          {eyebrow ? <div className="k-hero__eyebrow">{eyebrow}</div> : null}
          <h1 className="k-hero__title">{title}</h1>
          {chips && chips.length > 0 ? (
            <div className="k-hero__chips">
              {chips.map((c) => (
                <span key={c.label} className={`k-hero__chip${c.gold ? " k-hero__chip--gold" : ""}`}>
                  {c.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {unread !== undefined ? <BellLink unread={unread} /> : null}
      </div>
      {children}
    </header>
  );
}

export function BellLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/app/notices"
      className="k-bell"
      aria-label={unread > 0 ? `Notices, ${unread} unread` : "Notices"}
    >
      <Bell size={24} strokeWidth={1.9} aria-hidden="true" />
      {unread > 0 ? <span className="k-bell__n">{unread > 9 ? "9+" : unread}</span> : null}
    </Link>
  );
}

/** A cream title row for every screen that is not Home. */
export function Head({ title, back, aside }: { title: string; back?: string; aside?: ReactNode }) {
  return (
    <div className="k-head">
      {back ? (
        <Link href={back} className="k-head__back" aria-label="Back">
          <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
        </Link>
      ) : null}
      <h1 className="k-head__title">{title}</h1>
      {aside ? <span className="k-head__aside">{aside}</span> : null}
    </div>
  );
}

/** Seen of total, as a ring. Gold when full, because full means "all revision". */
export function Ring({
  value,
  total,
  hue,
  small = false,
  label,
}: {
  value: number;
  total: number;
  hue?: string;
  small?: boolean;
  label?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const full = total > 0 && value >= total;
  return (
    <div
      className={`k-ring${small ? " k-ring--small" : ""}`}
      style={
        {
          "--pct": `${pct}%`,
          "--fill": full && !hue ? "var(--gold)" : (hue ?? "var(--teal)"),
        } as React.CSSProperties
      }
      role="img"
      aria-label={label ?? `${value} of ${total}`}
    >
      <div className="k-ring__hole">
        {small ? (
          <span className="k-ring__n">
            {value}/{total}
          </span>
        ) : (
          <div>
            <span className="k-ring__n">{value}</span>
            <span className="k-ring__of">of {total}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const weekday = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "narrow" }).format(
    new Date(`${iso}T06:00:00Z`),
  );

/**
 * Days in a row, and this week as seven chips. A missed day is a dashed outline
 * — never a cross, never a broken-streak picture. It simply restarts.
 */
export function Streak({
  days,
  best,
  week,
  today,
  note,
  showWeek = true,
}: {
  days: number;
  best: number;
  week: { date: string; done: boolean }[];
  today: string;
  note?: string;
  showWeek?: boolean;
}) {
  return (
    <div className="k-card">
      <div className="k-streak__head">
        <span className="k-streak__flame" aria-hidden="true">
          <Flame size={19} strokeWidth={1.9} />
        </span>
        <span className="k-streak__n">
          {days === 0 ? "Start a streak today" : `${days} day${days === 1 ? "" : "s"} in a row`}
        </span>
        <span className="k-card__meta">{note ?? (best > days ? `Best ${best}` : "")}</span>
      </div>
      {showWeek ? (
        <div className="k-week" aria-label="This week">
          {week.map((d) => (
            <div
              key={d.date}
              className={`k-week__day${d.done ? " k-week__day--done" : ""}${d.date === today ? " k-week__day--today" : ""}`}
            >
              <div className="k-week__cell" aria-hidden="true">
                {d.done ? "★" : ""}
              </div>
              <span aria-label={`${d.date}${d.done ? ", done" : ""}`}>{weekday(d.date)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The crest, popping once with two sparks. The only celebration graphic. */
export function Celebrate({ size = 72 }: { size?: number }) {
  return (
    <div className="k-celebrate" aria-hidden="true">
      <Image src="/kids-icon.png" alt="" width={size} height={size} />
      <span className="k-spark" style={{ top: -6, right: -12, fontSize: 18 }}>
        ★
      </span>
      <span className="k-spark" style={{ top: 4, left: -14, fontSize: 13, animationDelay: "0.5s" }}>
        ★
      </span>
    </div>
  );
}

/** One mark, one line, one action. */
export function Empty({
  title,
  line,
  icon,
  teal = false,
  children,
}: {
  title: string;
  line?: string;
  icon?: ReactNode;
  teal?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="k-empty">
      <div className={`k-empty__mark${teal ? " k-empty__mark--teal" : ""}`}>
        {icon ?? <Image src="/kids-icon.png" alt="" width={52} height={52} />}
      </div>
      <h2 className="k-empty__title">{title}</h2>
      {line ? <p className="k-empty__line">{line}</p> : null}
      {children}
    </div>
  );
}
