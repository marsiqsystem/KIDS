-- SET 2026 online exam — schema.
--
-- Seeded from the master workbook; see scripts/seed-students.ts.
-- Student names are personal data and live ONLY here, never in the repo.

create table if not exists students (
  uid          char(9) primary key,          -- District(1)+Centre(2)+School(2)+GlobalSeq(4)
  name         text        not null,
  class        text        not null,          -- IX | X | XI | XII
  stream       text,                          -- Arts | Commerce | Science (XI/XII only)
  school_code  text        not null,
  school_name  text        not null,
  centre_code  text        not null,          -- CTR-01 .. CTR-21
  centre_name  text        not null,
  dob          text,                          -- DD-MM-YYYY as printed; 913 students have none
  is_demo      boolean     not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists students_centre_idx on students (centre_code);

-- One row per student per exam. The primary key IS the one-attempt rule.
create table if not exists attempts (
  uid           char(9) primary key references students (uid),
  paper_id      text        not null,
  status        text        not null default 'in_progress'
                  check (status in ('in_progress', 'submitted')),
  started_at    timestamptz not null default now(),
  deadline_at   timestamptz not null,         -- server-issued; the client never decides this
  submitted_at  timestamptz,
  answers       jsonb       not null default '{}'::jsonb,
  last_sync_at  timestamptz,
  score         integer,
  device_hash   text,
  ip            text,
  -- Off the public merit list, but still fully marked and still shown their own
  -- result. Set for the three CTR-12 students who re-sat on a demo account's
  -- admit card and were handed another class's paper: the mark is honestly
  -- theirs, the comparison with their classmates is not. See
  -- scripts/demo-substitutions.json and scripts/apply-demo-substitutions.ts.
  merit_eligible boolean    not null default true
)
-- Each student's answers row is rewritten ~120x during the exam. A low fillfactor
-- keeps those updates on-page (HOT), so they don't churn the index and hand us an
-- autovacuum storm at 10:47 on exam morning.
with (fillfactor = 70);

create index if not exists attempts_status_idx on attempts (status);

-- Append-only. The story of what happened, for when someone disputes a result.
create table if not exists exam_events (
  id         bigserial primary key,
  uid        char(9)     not null,
  kind       text        not null,   -- scan | start | sync | submit | autosubmit | reset | blur | substitute
  at         timestamptz not null default now(),
  detail     jsonb
);

create index if not exists exam_events_uid_idx on exam_events (uid, at);

-- ---------------------------------------------------------------- results ---
--
-- The published result, computed ONCE by scripts/publish-results.ts and read
-- back verbatim by the portal.
--
-- Nothing here is derived at request time, and that is the point. A rank is a
-- student's position among ~2,000 classmates; recomputing it on every scan
-- would mean scanning the whole cohort to render one page, and — worse — two
-- students opening their result a minute apart could be shown ranks computed
-- over slightly different data. A published result must be a fixed thing.
--
-- Online only. The offline written paper is marked by hand and is not
-- published yet; there is deliberately no offline table to half-fill.

create table if not exists online_results (
  uid            char(9) primary key references students (uid),
  marks          integer     not null,
  correct        integer     not null,
  wrong          integer     not null,
  blank          integer     not null,
  -- null for all four when the student is not ranked: see `ranked` below.
  class_rank     integer,
  centre_rank    integer,
  school_rank    integer,
  percentile     numeric(4,1),
  -- Cohort sizes are counts of who SAT, not who was enrolled — "148 of 1,842"
  -- must not quietly compare a rank against students who never turned up.
  class_sat      integer     not null,
  centre_sat     integer     not null,
  school_sat     integer     not null,
  class_avg      numeric(5,2) not null,
  class_high     integer     not null,
  started_at     timestamptz,
  submitted_at   timestamptz,
  minutes_taken  numeric(4,1),
  -- The paper submitted itself at the deadline rather than by hand.
  timed_out      boolean     not null default false,
  -- False for the three CTR-12 students who re-sat on a demo account's admit
  -- card and were handed another class's paper (see attempts.merit_eligible).
  -- The mark is honestly theirs and is shown in full; the comparison with
  -- classmates who sat a different paper is not, so their result page hides
  -- the ranks and the class bars entirely.
  ranked         boolean     not null default true,
  -- The sheet as marked, { "0": 2, "3": 1 }. Copied so the published result
  -- stands on its own even if an attempt row is ever touched afterwards.
  answers        jsonb       not null,
  paper_id       text        not null,
  computed_at    timestamptz not null default now()
);

-- How the cohort found each question — the "61% of Class X got this right"
-- line, and what drives the "you did well here" / "worth going back to" lists.
create table if not exists online_question_stats (
  paper_id     text    not null,
  n            integer not null,          -- 1-based, as the student saw it
  correct_pct  numeric(4,1) not null,     -- share of those who SAT, not of those who attempted
  sat          integer not null,
  primary key (paper_id, n)
);

-- One row. The cohort-wide numbers the result page quotes in prose, plus the
-- switch that decides whether any of this is visible at all.
create table if not exists results_meta (
  id           boolean     primary key default true check (id),
  -- Authorised: the marks are checked and the office is happy to stand behind
  -- them. NOT the same as visible — see publish_at.
  published    boolean     not null default false,
  published_at timestamptz,
  -- The moment students can see it. Absolute, server-side, and compared against
  -- the database clock, exactly like the exam window in config.ts: a phone's
  -- clock is whatever its owner set it to. Results are visible only when
  -- `published` AND now() >= publish_at, so the switch can be thrown hours
  -- early and still open to the second.
  publish_at   timestamptz,
  -- { enrolled, sat, absent, average, fullMarks } — computed with the demo
  -- accounts excluded, since a student reading "6,778 of 9,637 sat it" is
  -- being told about their classmates, not about the KIDS team.
  totals       jsonb       not null default '{}'::jsonb,
  computed_at  timestamptz not null default now()
);

-- `create table if not exists` above will not add a column to a table that
-- already exists, and this one was created before results were scheduled.
alter table results_meta add column if not exists publish_at timestamptz;
