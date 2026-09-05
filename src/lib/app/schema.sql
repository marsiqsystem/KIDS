-- The year-round student app — accounts and their audit trail.
--
-- Kept apart from src/lib/exam/schema.sql on purpose. That file describes one
-- morning in July: a paper, an attempt, a published result. This one describes
-- a door that stays open all year. They share exactly one thing — `students`,
-- which remains the single register of who exists — and nothing here may ever
-- change a mark, a rank or an attempt.

-- One row per student who has claimed their account.
--
-- Absence of a row is meaningful: it means "this child has never set a
-- password", which is the state all 9,714 of them start in and the state the
-- claim flow moves them out of. So this table is NOT seeded from `students`.
create table if not exists app_accounts (
  uid              char(9)     primary key references students (uid),
  -- scrypt, salted per account. See src/lib/app/passwords.ts for the format.
  -- Never a plaintext password, never a reversible one, and never logged.
  password_hash    text        not null,
  claimed_at       timestamptz not null default now(),
  password_set_at  timestamptz not null default now(),
  -- Set when a school or the KIDS office clears a forgotten password. The
  -- student is made to choose a new one before anything else happens, so an
  -- office-issued password can never become the account's standing password.
  must_change      boolean     not null default false,
  -- The lockout counter from design 4a: three wrong passwords, then fifteen
  -- minutes. Held here rather than in a session or a cookie because the whole
  -- point is that it survives closing the app and reopening it.
  failed_attempts  integer     not null default 0,
  locked_until     timestamptz,
  last_sign_in_at  timestamptz
);

-- Append-only, like exam_events, and for the same reason: when a family says
-- "somebody else opened my daughter's account", this is the only thing that can
-- answer them. The August link-sharing dispute was unwinnable because nothing
-- was written down. See src/lib/exam/schema.sql's note on attempts.device_hash.
--
-- `detail` never carries a password, a hash, or any part of either.
create table if not exists app_events (
  id      bigserial   primary key,
  uid     char(9)     not null,
  kind    text        not null,   -- claim | signin | signout | bad_password | bad_dob
                                  -- | unknown_id | locked | password_set
  at      timestamptz not null default now(),
  detail  jsonb
);

create index if not exists app_events_uid_idx on app_events (uid, at);


-- ------------------------------------------------------- the daily loop ---
--
-- Design 3a-3g. Three tables: what a student practises, what they have
-- answered, and the set they were handed on a given day.

-- The subjects the daily set draws from.
--
-- For IX and X this is a choice of three out of the seven sections they sat —
-- 45 questions of the 100 in their class. For XI and XII the four blocks they
-- actually answered are the natural set, but it is stored the same way for
-- both, because "what I practise" and "what I sat" are not the same question
-- and a student may change the first without touching the second.
create table if not exists app_subjects (
  uid      char(9)     not null references students (uid),
  -- The section name exactly as the question bank spells it: "Physical
  -- Science", "General Knowledge". Not an id — the bank has no subject table,
  -- and inventing one here would be a second spelling to keep in step.
  section  text        not null,
  added_at timestamptz not null default now(),
  primary key (uid, section)
);

-- Every question this student has ever been shown, and when it comes back.
--
-- One row per question per student, updated in place. The row IS the schedule:
-- there is no separate queue to drift out of step with it.
--
-- The intervals are Umar's, ruled 2 Sep, and they are the ones on the screens:
-- a question answered wrongly returns in 2 days; getting it right afterwards
-- walks it out 2 -> 6 -> 15 -> 30; a question right the first time goes 10 ->
-- 30. Nothing answered correctly returns the same week. See nextInterval() in
-- src/lib/app/loop.ts, which is the only place those numbers appear.
create table if not exists app_answers (
  uid              char(9)     not null references students (uid),
  -- The bank id, e.g. `X|All|General Paper|73`, carrying the medium suffix
  -- where the student has one. Stored as handed to the student, so a change of
  -- medium later cannot silently rewrite what they answered.
  question_id      text        not null,
  first_seen_at    timestamptz not null default now(),
  last_answered_at timestamptz not null default now(),
  -- The option index they picked last time, so the player can say "you chose C
  -- on 12 August too" rather than only that they were wrong.
  chosen           integer,
  was_correct      boolean     not null,
  times_seen       integer     not null default 1,
  times_correct    integer     not null default 0,
  times_wrong      integer     not null default 0,
  -- Has this ever been got wrong? A lapsed question walks the short ladder
  -- back up; one never missed takes the long one.
  lapsed           boolean     not null default false,
  interval_days    integer     not null,
  due_at           timestamptz not null,
  primary key (uid, question_id)
);

create index if not exists app_answers_due_idx on app_answers (uid, due_at);

-- The five questions handed out on one day, fixed once chosen.
--
-- Persisted rather than recomputed so that a student who closes the app
-- mid-set comes back to the SAME five (design 3g: "two of five answered... the
-- three you did not reach are still unseen"). Recomputing would quietly swap
-- the remaining three, and the promise that unreached questions are not
-- counted against them would be a lie.
--
-- Keyed by the date in IST, not UTC: a child practising at 11 p.m. in Kolkata
-- is still on today's set, and at 05:30 UTC the day would otherwise turn over
-- in the middle of their evening.
create table if not exists app_sets (
  uid          char(9)     not null references students (uid),
  on_date      date        not null,
  -- The bank ids, in the order they are asked.
  question_ids jsonb       not null,
  -- How many of them the student has never seen, for "2 new, 3 revision".
  new_count    integer     not null,
  built_at     timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz,
  primary key (uid, on_date)
);
