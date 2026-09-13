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

-- Which medium's question paper this candidate was handed on 19 July 2026.
-- '' is the default (English) paper. Only 'BENGALI' exists so far.
--
-- It has to be stored, not derived: the Bengali IX History (Q26-40) and X
-- Geography (Q41-55) sections ask DIFFERENT QUESTIONS, so the result page must
-- show a Bengali-medium candidate the questions and explanations from their own
-- paper. It was briefly derived from `offline_withheld_schools`, which was
-- wrong — that table records what is being held back, and it empties the moment
-- everything is released.
alter table students add column if not exists medium text not null default '';
create index if not exists students_medium_idx on students (medium) where medium <> '';

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


-- ------------------------------------------------- the offline written paper --
--
-- The 19 July 2026 OMR paper, marked on a machine that never touches the
-- internet. `Desktop\KIDS OMR 2026` owns the marking; `export_for_web.py`
-- writes a json of derived numbers and `scripts/import-offline-results.ts`
-- loads it here. Nothing about a scan crosses -- no page image, no handwriting,
-- no phone number. If a mark here is wrong it is wrong upstream, and re-running
-- the export and the import is how it is corrected.
--
-- Published SEPARATELY from the online paper. A student sat both on the same
-- morning and the two are marked, ranked and released independently, so this
-- has its own switch (`offline_published` on results_meta) and flipping it
-- cannot disturb the online result that has been live since 1 August.

create table if not exists offline_results (
  uid            char(9) primary key references students (uid),
  -- The class whose PAPER was marked. For 46 students the workbook's two class
  -- columns disagree, and for a handful a reviewer ruled from the class written
  -- on the sheet itself; this is the one that decided the answer key.
  class          text        not null,
  stream         text,
  marks          integer     not null,
  -- `correct` includes questions granted grace, which are awarded to every
  -- candidate. Kept that way so correct + wrong + blank = total_q on the page,
  -- and the student is never shown an arithmetic they cannot follow.
  correct        integer     not null,
  wrong          integer     not null,
  blank          integer     not null,
  grace          integer     not null,
  total_q        integer     not null,
  class_rank     integer,
  centre_rank    integer,
  school_rank    integer,
  percentile     numeric(4,1),
  class_sat      integer     not null,
  centre_sat     integer     not null,
  school_sat     integer     not null,
  class_avg      numeric(5,2) not null,
  class_high     integer     not null,
  ranked         boolean     not null default true,
  -- [{ name, key_id, first, last, total, correct, wrong, blank, grace, marks }]
  -- Seven sections for IX/X; English & GK plus three chosen subjects for XI/XII.
  sections       jsonb       not null,
  -- The three optional subjects, XI/XII only. Read off the sheet, not the
  -- workbook: the sheet is what the student actually answered.
  panels         jsonb       not null default '[]'::jsonb,
  -- The answer sheet itself, one character per question, 1..100. See
  -- export_for_web.py for the encoding. 400 bytes instead of 100 json objects.
  marked         text        not null,   -- a b c d, '-' blank, 1st of a double
  second         text        not null,   -- the 2nd bubble of a double, else '-'
  answer_key     text        not null,   -- a b c d, 'g' where grace was granted
  outcome        text        not null,   -- c w b d g
  form           text        not null,   -- X100 | XII100, the printed sheet
  source         text        not null,   -- the scan's filename, for disputes
  -- How many questions a person settled by eye rather than the reader measuring
  -- them. 17,196 across 592 sheets, mostly sheets typed out from the paper.
  hand_set       integer     not null default 0,
  computed_at    timestamptz not null default now()
);

create index if not exists offline_results_class_idx on offline_results (class);

-- How the cohort found each question, keyed by the ANSWER KEY rather than by a
-- question number on the page. IX and X sit one paper of 100, but XI and XII
-- each answer English & GK plus three subjects of their own choosing, so "Q37"
-- is not the same question for two classmates. Keyed this way, "61% got this
-- right" always means 61% of the people who actually sat that block.
create table if not exists offline_question_stats (
  key_id       text    not null,        -- ix-paper | xii-arts-his | ...
  n            integer not null,        -- 1-based within that key
  correct_pct  numeric(4,1) not null,   -- share of those who SAT it
  sat          integer not null,
  primary key (key_id, n)
);

-- The class average for each named section, which the result page draws as a
-- line across every bar. Streamed separately from the per-question stats
-- because a section is what a student recognises ("Physical Science"), and a
-- key id is not.
create table if not exists offline_section_stats (
  class    text        not null,
  stream   text        not null default '',
  section  text        not null,
  total    integer     not null,
  sat      integer     not null,
  avg      numeric(5,2) not null,
  primary key (class, stream, section)
);

-- The offline paper's own switch, alongside the online one. Same two-step:
-- `offline_published` says the office stands behind the marks,
-- `offline_publish_at` says when students may see them.
alter table results_meta add column if not exists offline_published    boolean not null default false;
alter table results_meta add column if not exists offline_published_at timestamptz;
alter table results_meta add column if not exists offline_publish_at   timestamptz;
alter table results_meta add column if not exists offline_totals       jsonb not null default '{}'::jsonb;
alter table results_meta add column if not exists offline_computed_at  timestamptz;

-- Schools whose written results stay shut while the rest of the cohort's open.
--
-- The switch above is one lever for 7,287 children. This is the exception list
-- in front of it: a student whose school is named here is told "not published
-- yet", exactly as if the whole paper were still shut, on /portal and on
-- /marksheet alike.
--
-- Deliberately NOT a change to any mark, rank or cohort figure. These children
-- sat the same paper as everyone else and are counted in every average and
-- every rank; only the door to their own page is closed. So a school can be
-- released later by deleting one row — nothing is recomputed, and no classmate's
-- rank moves when it is.
--
-- Keyed on `students.school_name` because that is the only school identity the
-- roster actually carries: `school_code` is not unique across centres (a dozen
-- schools share SC-01). `scripts/withhold-schools.ts` refuses any name that
-- does not match a school exactly, so a typo cannot silently withhold nobody.
create table if not exists offline_withheld_schools (
  school_name text primary key,
  reason      text,
  added_at    timestamptz not null default now()
);


-- ------------------------------------------------- series, phases and papers --
--
-- Until September 2026 this database could hold exactly one exam. `attempts`,
-- `online_results` and `offline_results` were each keyed on the student alone,
-- the window was a hardcoded date in src/lib/exam/config.ts, and publication
-- was two booleans on a single `results_meta` row. SET 2026 was not a row --
-- it was the shape of the tables.
--
-- SET 2026 Phase 2, in December, cannot exist in that shape, and neither can a
-- mock. These three tables are what the exam becomes instead.
--
-- Three levels, because the vocabulary has three levels and collapsing any two
-- of them loses something the award needs:
--
--   series  SET 2026            the whole cycle a child is awarded on
--   phase   Phase 1 / Phase 2   a sitting, months apart
--   paper   the offline OMR     what a student actually sat, and was marked on
--
-- Phase 1 was TWO papers on one morning (an online 50 and an offline 100) and
-- the award counts only the offline one -- Umar's ruling, 13 September. That is
-- exactly why `phase` and `paper` are not one table: the ruling is stored as
-- `exam_phases.award_paper_id`, one foreign key, rather than as a condition
-- written into whichever query happens to compute the award.

create table if not exists exam_series (
  id          bigserial   primary key,
  code        text        not null unique,   -- 'SET2026'
  name        text        not null,
  -- How a student's award is computed across the phases.
  --
  -- DATA, deliberately, and not logic in a page: on 13 September the measured
  -- gap between the two Phase 1 formats was 7.91 points in the online paper's
  -- favour, which means averaging an OMR mark with an online one ranks a
  -- student who sat both BELOW one who sat only the second. That may be
  -- re-decided in December with the real marks in hand, and when it is it
  -- should be one update here and not a released deployment.
  award_rule  text        not null default 'average'
                check (award_rule in ('average', 'best', 'latest', 'sum')),
  -- What to do with a student who has a mark for only some of the phases.
  --
  --   'alone'    the marks they have stand, and they rank in the same list.
  --              Umar's ruling: the 2,304 who missed Phase 1, and everyone who
  --              registers between now and December, are ranked on Phase 2 by
  --              itself.
  --   'separate' they are ranked in their own list instead, so a one-phase mark
  --              is never compared against a two-phase average.
  incomplete  text        not null default 'alone'
                check (incomplete in ('alone', 'separate')),
  created_at  timestamptz not null default now()
);

create table if not exists exam_phases (
  id          bigserial   primary key,
  series_id   bigint      not null references exam_series (id),
  code        text        not null,          -- 'P1' | 'P2'
  name        text        not null,          -- 'Phase 1' | 'Phase 2'
  ordinal     integer     not null,
  -- Which paper's mark represents this phase in the award. For Phase 1 this is
  -- the OFFLINE paper, never the online one. Deliberately NOT a declared
  -- foreign key: exam_papers is created below this table, and the whole set is
  -- written by one script (scripts/migrate-exam-phases.ts), which checks it.
  award_paper_id bigint,
  created_at  timestamptz not null default now(),
  unique (series_id, code)
);

create table if not exists exam_papers (
  id          bigserial   primary key,
  phase_id    bigint      not null references exam_phases (id),
  code        text        not null,          -- 'P1-OFFLINE' | 'P1-ONLINE' | 'P2-ONLINE'
  name        text        not null,
  -- 'offline' is marked by the OMR tool and imported; 'online' is sat in the
  -- app and marked here. Nothing else is a mode.
  mode        text        not null check (mode in ('online', 'offline')),
  -- A mock is sat, marked and shown to the student exactly like a live paper.
  -- It is excluded from every award and every published total, and that is the
  -- only difference. November's rehearsal is a mock.
  kind        text        not null default 'live' check (kind in ('live', 'mock')),
  max_marks   integer     not null,
  question_count integer,

  -- The window. Absolute and server-side, exactly as config.ts insisted: a
  -- phone's clock is whatever its owner set it to, so it is never consulted for
  -- anything that matters. All null for an offline paper, which has no app
  -- window at all.
  scan_opens_at    timestamptz,
  starts_at        timestamptz,
  ends_at          timestamptz,
  duration_minutes integer,

  -- Must a student be marked present at a centre before the paper will open?
  --
  -- False for everything sat in July -- the invigilator at the desk was the
  -- check, and the app never knew about it. True for December, where a student
  -- scans the invigilator's rotating code from their own phone and the
  -- attendance register writes itself.
  requires_checkin boolean not null default false,

  -- Publication, per paper. Replaces the two booleans on the single
  -- `results_meta` row, which could only ever describe one exam. Visible to a
  -- student only when `published` AND now() >= publish_at, so the switch can be
  -- thrown hours early and still open to the second -- the same rule
  -- results_meta already used, kept deliberately identical.
  published    boolean     not null default false,
  published_at timestamptz,
  publish_at   timestamptz,

  created_at  timestamptz not null default now(),
  archived_at timestamptz,
  unique (phase_id, code)
);

create index if not exists exam_papers_phase_idx on exam_papers (phase_id);

-- Which paper a row of marks belongs to.
--
-- Added here as nullable so a fresh database and an existing one take the same
-- path; scripts/migrate-exam-phases.ts backfills July's rows, makes the column
-- NOT NULL and then moves the primary key. Named `exam_paper_id` and not
-- `paper_id` on purpose: `attempts.paper_id` already exists and means something
-- completely different (the CLASS paper, 'SET2026-IX'), and two columns a
-- letter apart meaning different things is a bug waiting for a tired evening.
alter table attempts         add column if not exists exam_paper_id bigint references exam_papers (id);
alter table online_results   add column if not exists exam_paper_id bigint references exam_papers (id);
alter table offline_results  add column if not exists exam_paper_id bigint references exam_papers (id);

-- The receipt a student is shown when their paper is in (Design 6d, rule 9).
-- July's 6,780 attempts have none: no receipt existed then, and inventing one
-- after the fact would be a number nobody was ever shown.
alter table attempts add column if not exists receipt text;
create unique index if not exists attempts_receipt_idx on attempts (receipt) where receipt is not null;


-- --------------------------------------------------------- question sets --
--
-- The questions for every paper after July.
--
-- July's four online papers live in src/lib/exam/set2026-papers.ts, answer keys
-- and all, and that was acceptable only because they were committed on the
-- morning of the exam. THE REPOSITORY IS PUBLIC. A paper for December committed
-- in October is a paper every student can read in October. So from Phase 2 on,
-- a question set is loaded into this table from a file kept off GitHub, by
-- scripts/load-question-set.ts, and the repository never holds it.
--
-- `code` is what src/lib/exam/schedule.ts asks for, most specific first:
--   P2-ONLINE-XI-SCIENCE-BENGALI, P2-ONLINE-XI-BENGALI, P2-ONLINE-XI-SCIENCE,
--   P2-ONLINE-XI
-- so a paper can be one set per class, or split by stream, or by medium, and
-- the choice is made by what is loaded rather than by code.
--
-- The answer key sits in its own column, and nothing that sends questions to a
-- phone ever selects it.

create table if not exists exam_question_sets (
  code           text        primary key,
  exam_paper_id  bigint      not null references exam_papers (id),
  class          text        not null check (class in ('IX', 'X', 'XI', 'XII')),
  stream         text,
  medium         text        not null default '',
  -- [{ q, context?, options: [...] }] -- exactly the shape a student is shown.
  questions      jsonb       not null,
  -- [int], index of the correct option per question.
  answer_key     jsonb       not null,
  question_count integer     not null,
  -- sha256 of the source file, so "is this the file we checked" has an answer.
  checksum       text        not null,
  loaded_at      timestamptz not null default now(),
  loaded_by      text        not null
);

create index if not exists exam_question_sets_paper_idx on exam_question_sets (exam_paper_id);
