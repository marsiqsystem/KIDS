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


-- ---------------------------------------------------------- the notices ---
--
-- Design 7b. The notices themselves are NOT stored: they are computed from
-- this student's own record when they look (see src/lib/app/notices.ts), so
-- there is no fan-out to write, retry or repair, and a school withheld after
-- the fact cannot leave a stale "your results are published" behind.
--
-- What has to be stored is which ones have been read, because "read" is the
-- one fact about a notice that is not derivable from anything else.
create table if not exists app_notice_reads (
  uid        char(9)     not null references students (uid),
  -- Carries the event's identity, not a row id: `results:17 August 2026|...`,
  -- `paper-open:X100`, `daily:2026-09-07`. A genuinely new event therefore has
  -- a new key and is correctly unread, and "read" survives a redeploy.
  notice_key text        not null,
  read_at    timestamptz not null default now(),
  primary key (uid, notice_key)
);


-- ---------------------------------------------------------- the devices ---
--
-- Phase 0. The August link-sharing dispute (Trisha Ghosh, 3 Aug) could not be
-- answered because `attempts.device_hash` and `attempts.ip` are NULL on every
-- row — nothing had ever been written to them, so no query could say who had
-- typed a paper. This table is that omission corrected, a year early and on the
-- door rather than on the exam.
--
-- One row per phone an account has ever been opened on. Append-and-touch: rows
-- are never deleted, because the question this table exists to answer is always
-- asked afterwards.
create table if not exists app_devices (
  uid           char(9)     not null references students (uid),
  -- 32 hex characters, generated by the phone on first run and kept in its own
  -- storage. Not a fingerprint: it identifies an installation, not a person or
  -- a handset, it is worthless to anyone who steals it, and clearing the app's
  -- data makes a new one. That is the honest limit of what it proves, and it is
  -- still infinitely more than NULL.
  device_id     char(32)    not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  sign_ins      integer     not null default 1,
  -- "Android phone", "iPhone", "Windows computer" — derived once, at sign-in,
  -- so the Profile screen can say something a child recognises. The raw
  -- user-agent is kept beside it because the derivation will be wrong someday.
  label         text,
  user_agent    text,
  primary key (uid, device_id)
);

create index if not exists app_devices_seen_idx on app_devices (uid, last_seen_at desc);

-- The phone this account is currently bound to. Signing in on a second phone
-- moves it, and the first phone's session stops working at its next page load.
-- One account, one phone at a time — which is the whole of the answer to a
-- password passed round a classroom.
alter table app_accounts add column if not exists current_device_id char(32);

-- Push, for the Android app. See src/lib/app/push.ts.
--
-- The Firebase registration token lives on the device row rather than in a
-- table of its own, because a token identifies an INSTALLATION and that is
-- exactly what this row already is. It also means the device rule and the push
-- list cannot disagree: only the phone an account is bound to is sent to, so a
-- student who moves handsets stops being reachable on the old one at the same
-- moment their session does, with nothing separate to remember to clear.
--
-- Null is the ordinary state. A browser has no token, an iPhone has no token
-- (Android's WebView has no Push API and iOS is not packaged at all), and an
-- Android student who declines the permission has no token. Every send is a
-- courtesy to whoever happens to have one.
alter table app_devices add column if not exists push_token    text;
alter table app_devices add column if not exists push_token_at timestamptz;

-- Set when FCM says a token is gone — the app was uninstalled, or Firebase
-- retired it. Stamped rather than nulled on purpose: "had a token and it
-- stopped working" is a different fact from "never registered", and the
-- difference is the only way to tell whether push is reaching anybody. A new
-- token from the same installation clears it.
alter table app_devices add column if not exists push_failed_at timestamptz;

create index if not exists app_devices_push_idx
  on app_devices (uid) where push_token is not null;


-- ------------------------------------------------------------ the day ---
--
-- Design turn 8, part one. For a student on the coaching programme, Home
-- stops being a feed and becomes THE DAY: one vertical spine, times down the
-- left, exactly one card open — the block that is now.
--
-- Ruled by Umar on 11 Sep, and the shape of these tables follows from it:
--
--   * Home BECOMES the day for those 65. No sixth tab: a sixth tab is paid for
--     by all 9,714 students so that 65 can use it, and it would make coaching
--     a place you visit rather than a day you are inside.
--   * TWO blocks are fixed for everybody — the 5:30 wake and the class —
--     because a day nobody shares is not a day together. The rest move inside
--     a window the teacher sets. 65 children in 112 households have different
--     school buses and different mothers who need help at seven; a rigid
--     routine is wrong about most of them by week two.
--   * School is carried, never tracked. Nothing rings between 10:30 and 4:30
--     and nothing inside it is counted — the app would otherwise be marking a
--     child present at something it cannot see.

-- One per batch. The programme is a thing with a beginning and an end, and the
-- end is designed rather than a silence: see the last-day screen.
create table if not exists coaching_programmes (
  id           bigserial   primary key,
  batch_id     bigint      not null references admin_batches (id),
  name         text        not null,
  starts_on    date        not null,
  weeks        integer     not null default 14,
  -- School, as a plain window in IST. Not a block a student completes.
  school_from  time        not null default '10:30',
  school_to    time        not null default '16:30',
  -- ISO weekday numbers, 1 = Monday. Six days here, because they are Indian
  -- school children and Saturday is a school day.
  school_days  integer[]   not null default '{1,2,3,4,5,6}',
  created_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create unique index if not exists coaching_programmes_batch_idx
  on coaching_programmes (batch_id) where archived_at is null;

-- The spine. One row per block per programme, in the order they happen.
--
-- `at_time` is where the block sits by default. `window_from`/`window_to` are
-- how far a student may move it — equal to at_time on a fixed block. Turn 8
-- is explicit that the teacher's build-the-day screen sets a WINDOW per block
-- rather than a clock time, so the window is the real field and the time is
-- the default inside it.
create table if not exists coaching_blocks (
  id           bigserial   primary key,
  programme_id bigint      not null references coaching_programmes (id),
  -- wake | ritual | revision | daily | school | class | homework | winddown
  --
  -- Three of these are not their own content: `daily` opens the set that
  -- src/lib/app/loop.ts already builds, `class` reads admin_classes for the
  -- day, and `school` is a dashed stretch with nothing to complete. The day
  -- assembles things that exist rather than becoming a second copy of them.
  kind         text        not null,
  label        text        not null,
  subtitle     text,
  at_time      time        not null,
  window_from  time        not null,
  window_to    time        not null,
  minutes      integer,
  -- Fixed for all 65. Only the wake and the class, by ruling.
  fixed        boolean     not null default false,
  sort         integer     not null,
  removed_at   timestamptz
);

create index if not exists coaching_blocks_programme_idx
  on coaching_blocks (programme_id, sort) where removed_at is null;

-- What a student actually did, one row per block per day.
--
-- Keyed by (uid, on_date, kind) rather than by block id so that moving or
-- re-creating a block cannot orphan a day a child already kept. The date is
-- IST: a student finishing revision at 11 p.m. in Kolkata is still on today.
--
-- Absence is "not done", and for a school block it means nothing at all —
-- nothing inside school hours is ever counted or missed.
create table if not exists coaching_marks (
  uid      char(9)     not null references students (uid),
  on_date  date        not null,
  kind     text        not null,
  done_at  timestamptz not null default now(),
  -- "up at 5:34", "9 minutes", whatever the block itself wants to remember.
  detail   jsonb,
  primary key (uid, on_date, kind)
);

create index if not exists coaching_marks_uid_idx on coaching_marks (uid, on_date desc);


-- Who is in the room. Design 8k.
--
-- 65 squares, one per student, NOBODY NAMED — not even the student themselves,
-- so there is nothing on the screen to compare yourself against. The bars say
-- what the room is DOING, never who: a child can see the corridor is full
-- without being able to check on any one person in it.
--
-- One row per student, updated in place. Presence is POLLED when the app opens
-- rather than held on a socket, which is what 3G and a battery at 12% can
-- afford — Design is explicit about it and it is also the only honest thing a
-- web app in a WebView can promise.
--
-- `doing` is only ever what the app can actually observe. There is no row for
-- homework because homework does not exist yet; a bar for it would be a number
-- made up about children.
create table if not exists coaching_presence (
  uid      char(9)     primary key references students (uid),
  seen_at  timestamptz not null default now(),
  -- here | practising | watching | class | sitting
  doing    text        not null default 'here',
  -- A study hour runs until this moment even if the app is closed: the going
  -- matters more than what you do when you arrive, and a phone that locks
  -- itself after thirty seconds must not end the hour.
  until    timestamptz
);

create index if not exists coaching_presence_seen_idx on coaching_presence (seen_at desc);
