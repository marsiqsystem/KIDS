-- The KIDS control centre — the people who run the programme, and the groups
-- they run it for.
--
-- Kept apart from src/lib/app/schema.sql for the same reason that file is kept
-- apart from the exam's: they answer different questions. `app_*` describes a
-- student's own account. This file describes the *institute* — who works here,
-- who may change things, which children are taught together, and who did what.
--
-- The rule that shapes every table below: a batch is a ROW, never a list in
-- code. export_for_web.py and make_results_xlsx.py each name their batches in
-- a Python literal, and a batch added to one but not the other disappears from
-- the results with no error at all. That has already cost a rebuild once. The
-- office must be able to create a batch, move a child between batches and
-- retire a batch without anybody deploying anything.


-- ------------------------------------------------------------- the staff ---

-- One row per person who may sign in to /admin — the KIDS office and the
-- teachers they create.
--
-- This table exists because the shared key could not survive what /admin became.
-- A single KIDS_ADMIN_KEY was right while /admin only *watched* one exam: the
-- worst a stolen key could do was show somebody numbers. A page that can
-- reassign a child's batch needs to answer "who did that", and a shared key
-- makes every audit row read `admin`. See src/lib/admin/auth.ts, which now
-- holds that key for bootstrap and lock-out only.
create table if not exists admin_staff (
  -- Typed at sign-in, so it has to be sayable down a phone: A-0001 for the
  -- office, T-0001 for a teacher. Assigned by nextStaffId() in staff.ts, never
  -- chosen by the person, so two teachers cannot pick the same one.
  staff_id        text        primary key,
  full_name       text        not null,
  -- 'admin' may create staff, batches and rosters. 'teacher' may see only the
  -- batches they are assigned to. There is deliberately no third role: a role
  -- nobody has yet is a permission check nobody has tested.
  role            text        not null check (role in ('admin', 'teacher')),
  -- scrypt, salted per account, in the format src/lib/app/passwords.ts writes.
  -- The same hashing the children get; there is no reason for staff to have
  -- weaker storage than a fifteen-year-old.
  password_hash   text        not null,
  phone           text,
  -- True from the moment an admin creates the account. The one-time password
  -- is shown on screen once and must be replaced at first sign-in, so an
  -- office-issued password can never become a standing one.
  must_change     boolean     not null default true,
  -- Same lockout as the student app: three wrong passwords, then fifteen
  -- minutes. Staff accounts are the ones worth guessing at, so they get the
  -- protection too.
  failed_attempts integer     not null default 0,
  locked_until    timestamptz,
  last_sign_in_at timestamptz,
  created_at      timestamptz not null default now(),
  -- Null only for the first admin, who is bootstrapped from KIDS_ADMIN_KEY and
  -- therefore has no creator to name.
  created_by      text        references admin_staff (staff_id),
  -- Disabling, never deleting. A teacher who leaves must stop being able to
  -- sign in, but the batches they taught and the rows they wrote have to keep
  -- pointing at a real name.
  disabled_at     timestamptz,
  disabled_by     text        references admin_staff (staff_id)
);

create index if not exists admin_staff_role_idx on admin_staff (role, disabled_at);


-- ----------------------------------------------------------- the batches ---

-- A teaching group. The coaching programme's unit.
--
-- Nothing here assumes the Class X coaching cohort or its size. The programme
-- that starts with 65 children in one class will not be the only one, and a
-- table that hardcodes this term's shape has to be migrated to survive the next.
create table if not exists admin_batches (
  id           bigserial   primary key,
  name         text        not null,
  -- Free text on purpose: 'X', 'IX', 'XI Science'. The students table's own
  -- class values are not a closed set either (see the 46 students whose two
  -- class columns disagree), so a foreign key here would refuse real children.
  class_label  text,
  -- 'HINDI' | 'BENGALI' | 'URDU' | null. Matches students.medium when set, and
  -- null means the batch is mixed or it does not matter.
  medium       text,
  notes        text,
  created_at   timestamptz not null default now(),
  created_by   text        not null references admin_staff (staff_id),
  -- Retired, not deleted — a finished term's roster is the record of who was
  -- taught, and next term's report will want it.
  archived_at  timestamptz
);

create unique index if not exists admin_batches_name_idx
  on admin_batches (lower(name)) where archived_at is null;


-- Which children are in a batch.
--
-- `removed_at` rather than a delete: "was Ayesha in the morning batch in
-- October" is a question somebody will ask in January, and a deleted row
-- cannot answer it. The partial unique index below is what keeps that honest —
-- a child may be in a batch once at a time, and may be re-added after being
-- removed.
create table if not exists admin_batch_members (
  id         bigserial   primary key,
  batch_id   bigint      not null references admin_batches (id),
  uid        char(9)     not null references students (uid),
  added_at   timestamptz not null default now(),
  added_by   text        not null references admin_staff (staff_id),
  removed_at timestamptz,
  removed_by text        references admin_staff (staff_id)
);

create unique index if not exists admin_batch_members_current_idx
  on admin_batch_members (batch_id, uid) where removed_at is null;

create index if not exists admin_batch_members_uid_idx
  on admin_batch_members (uid) where removed_at is null;


-- Which teachers take a batch, and for what.
--
-- Many-to-many both ways by design: one batch has several teachers, and one
-- teacher takes several batches. `subject` is null when a teacher takes the
-- whole batch rather than one paper.
create table if not exists admin_batch_teachers (
  id          bigserial   primary key,
  batch_id    bigint      not null references admin_batches (id),
  staff_id    text        not null references admin_staff (staff_id),
  subject     text,
  assigned_at timestamptz not null default now(),
  assigned_by text        not null references admin_staff (staff_id),
  removed_at  timestamptz,
  removed_by  text        references admin_staff (staff_id)
);

create unique index if not exists admin_batch_teachers_current_idx
  on admin_batch_teachers (batch_id, staff_id, coalesce(subject, ''))
  where removed_at is null;


-- ------------------------------------------------------------- the audit ---

-- Append-only. The whole reason named accounts replaced the shared key.
--
-- Every write the control centre makes lands here, before or alongside the
-- change itself. `detail` never carries a password, a hash, or any part of
-- either — the same rule app_events keeps.
--
-- The August link-sharing dispute was unwinnable because nothing had been
-- written down. This is that lesson applied to the office rather than to the
-- students.
create table if not exists admin_events (
  id          bigserial   primary key,
  at          timestamptz not null default now(),
  -- The staff_id that did it, or 'bootstrap' for the one action the shared key
  -- can still take. Not a foreign key: an audit row must outlive any attempt
  -- to tidy up the staff table.
  actor       text        not null,
  action      text        not null,   -- staff_created | staff_disabled | staff_enabled
                                      -- | password_reset | signin | signout | bad_password
                                      -- | locked | batch_created | batch_archived
                                      -- | member_added | member_removed
                                      -- | teacher_assigned | teacher_unassigned
                                      -- | post_written | post_retracted
  target_kind text,                   -- staff | batch | student | post
  target_id   text,
  detail      jsonb
);

create index if not exists admin_events_at_idx on admin_events (at desc);
create index if not exists admin_events_target_idx on admin_events (target_kind, target_id, at desc);


-- ---------------------------------------------------------- live classes ---

-- A class in the timetable, and later the room it was taught in.
--
-- The coaching programme is three to four months of Class X teaching, run
-- inside the app rather than on Google Meet. A row here is scheduled by the
-- office before it happens, becomes joinable when the teacher starts it, and
-- keeps its recording link afterwards.
--
-- `room` is the Jitsi room name, minted once and never reused. It is random
-- rather than derived from the date because a guessable room is one a child
-- can type into a public Jitsi instance and sit in alone. It is not the
-- security boundary either way — the server refuses anyone without a signed
-- token — but there is no reason to publish a name.
--
-- A class belongs to a batch, never to a list of students: the same rule the
-- rest of the control centre keeps, so that a child moved between batches is
-- moved once.
create table if not exists admin_classes (
  id           bigserial   primary key,
  batch_id     bigint      not null references admin_batches (id),
  title        text        not null,
  subject      text,
  starts_at    timestamptz not null,
  minutes      integer     not null default 90,
  room         text        not null unique,
  created_at   timestamptz not null default now(),
  created_by   text        not null references admin_staff (staff_id),
  -- Set when the teacher opens the room. Until then no student token is
  -- minted, so "starts at 6" is a plan and this is the fact.
  started_at   timestamptz,
  started_by   text        references admin_staff (staff_id),
  ended_at     timestamptz,
  cancelled_at timestamptz,
  cancelled_by text        references admin_staff (staff_id),
  -- The unlisted YouTube link, pasted after the class. Jibri needs roughly its
  -- own machine, so the teacher records locally and posts it.
  recording_url text
);

create index if not exists admin_classes_batch_idx
  on admin_classes (batch_id, starts_at desc);

create index if not exists admin_classes_upcoming_idx
  on admin_classes (starts_at) where cancelled_at is null;


-- Who was issued a token for a class.
--
-- Read this for what it is. A row means the person tapped Join and we signed a
-- token for them — not that they stayed, listened, or were awake. Every figure
-- off this table is a FLOOR, the same caveat the result-page counter carries:
-- we can prove nobody got in without a row here, and nothing more than that.
--
-- Presence proper would come from the server's own events. It is not built,
-- and this table is not it.
create table if not exists admin_class_attendance (
  id         bigserial   primary key,
  class_id   bigint      not null references admin_classes (id),
  -- Exactly one of these is set. A teacher is not a student and must not be
  -- counted as one when the register is read.
  uid        text        references students (uid),
  staff_id   text        references admin_staff (staff_id),
  moderator  boolean     not null default false,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  tokens     integer     not null default 1,
  constraint admin_class_attendance_who
    check ((uid is not null) <> (staff_id is not null))
);

create unique index if not exists admin_class_attendance_student_idx
  on admin_class_attendance (class_id, uid) where uid is not null;

create unique index if not exists admin_class_attendance_staff_idx
  on admin_class_attendance (class_id, staff_id) where staff_id is not null;


-- ----------------------------------------------------------------- posts ---
--
-- Something the office wants to say, that is not derivable from a child's own
-- record.
--
-- Everything else in the student's notice list is COMPUTED — results published,
-- a paper opening, today's set waiting (see src/lib/app/notices.ts). A post is
-- the one kind that cannot be: "no class on Thursday, Eid" is not a fact about
-- anybody's marks, so somebody has to type it.
--
-- What has NOT changed is the fan-out. One row is written here, and every
-- student who should see it computes that when they look, exactly as the other
-- four kinds do. There is no per-student copy, so there is no job to write, no
-- job to retry, and nothing to repair when a child joins a batch tomorrow — a
-- post written last week is simply there for them the moment they are added,
-- and gone the moment they are removed. A table of 9,714 rows per announcement
-- would have had to answer all three of those questions.
--
-- A post is never edited. Retract it and write another: the notice's key is
-- `post:<id>`, and a student who has read one has read the words that were
-- there. Editing the body under a read mark would tell somebody they had been
-- told something they were never shown.
create table if not exists admin_posts (
  id           bigserial   primary key,
  title        text        not null,
  body         text        not null,
  -- 'all' reaches every claimed account. 'batch' reaches whoever is in that
  -- batch AT THE MOMENT THEY LOOK, which is why batch_id is a reference and not
  -- a captured list of UIDs.
  audience     text        not null check (audience in ('all', 'batch')),
  batch_id     bigint      references admin_batches (id),
  posted_at    timestamptz not null default now(),
  posted_by    text        not null references admin_staff (staff_id),
  -- Taken down, never deleted: "what did the office tell them in October" is a
  -- question with the same shape as "who was in the morning batch", and the
  -- audit row alone does not carry the words.
  retracted_at timestamptz,
  retracted_by text        references admin_staff (staff_id),
  constraint admin_posts_audience_batch
    check ((audience = 'batch') = (batch_id is not null))
);

create index if not exists admin_posts_live_idx
  on admin_posts (posted_at desc) where retracted_at is null;


-- ----------------------------------------------------------- registrations --
--
-- A child who is not on the SET 2026 register asking to be.
--
-- Every one of the 9,652 UIDs in `students` was minted outside this repo, by
-- build_seed.py, from the master workbook on Umar's laptop. The app has never
-- created one, and `students` has deliberately been read-only from /admin,
-- because a correction made only here is reverted by the next reseed.
--
-- Registration changes that, and the shape of this table is what keeps it safe.
-- An application is NOT a student. It has no UID, it is invisible to the exam,
-- the merit list and every published total, and it stays that way until a named
-- office account approves it -- Umar's ruling, 13 September. Approval is the
-- moment a UID is minted and a row appears in `students`; before that there is
-- nothing to revert and nothing to leak.
--
-- The school is chosen from the register, never typed. `school_code` is NOT a
-- school identifier -- it is a per-centre index, and SC-01 names twenty-one
-- different schools -- so a school is (centre_code, school_code) and this table
-- stores both. 133 such pairs exist, with no collisions.

create table if not exists app_registrations (
  id           bigserial   primary key,

  -- What the family typed. Kept exactly as entered even after approval, so a
  -- dispute about a misspelt name can be answered with what was actually
  -- submitted rather than with what the office corrected it to.
  name         text        not null,
  -- DD-MM-YYYY, matching `students.dob`, which is TEXT in that format and is
  -- printed on the admit card the same way. Parsing it into a Date turns every
  -- row into "Invalid Date" -- the claim screen already asks for day, month and
  -- year in three boxes for exactly this reason.
  dob          text        not null,
  class        text        not null,          -- IX | X | XI | XII
  stream       text,                          -- XI/XII only
  centre_code  text        not null,
  school_code  text        not null,
  school_name  text        not null,
  guardian_phone text,

  -- Where the application came from, so the office can tell an app
  -- registration from anything added later by another route.
  source       text        not null default 'app',

  -- The device that applied. This is what lets the app show a pending
  -- application to the phone that made it, before any account exists to sign
  -- in to -- and what makes "their app automatically opens their profile"
  -- possible without a second login.
  device_id    text,

  status       text        not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  applied_at   timestamptz not null default now(),

  -- Set on approval. The UID minted for this child, and who minted it.
  uid          char(9)     references students (uid),
  decided_at   timestamptz,
  decided_by   text        references admin_staff (staff_id),
  -- Shown to the family, so a rejection is never a silent disappearance.
  reason       text,

  -- What the duplicate guard found when the application was made: the UIDs of
  -- existing students with the same name and date of birth. Stored rather than
  -- recomputed, because the office needs to see what the machine saw at the
  -- time it decided, not what the register looks like today.
  possible_duplicates jsonb not null default '[]'::jsonb
);

create index if not exists app_registrations_pending_idx
  on app_registrations (applied_at) where status = 'pending';
create index if not exists app_registrations_device_idx
  on app_registrations (device_id) where status = 'pending';
create index if not exists app_registrations_school_idx
  on app_registrations (centre_code, school_code) where status = 'pending';

-- One pending application per device. Not a security boundary -- a determined
-- person clears app data and applies again -- but it stops the commonest real
-- problem, which is a parent tapping Apply three times on a slow connection
-- and the office seeing triplets.
create unique index if not exists app_registrations_one_per_device
  on app_registrations (device_id) where status = 'pending' and device_id is not null;

-- The counter that mints a UID.
--
-- A UID is District(1) + Centre(2) + School(2) + GlobalSeq(4), so only the last
-- four digits count up, and they count up ACROSS THE WHOLE REGISTER rather than
-- within a school. The highest in use is 9719.
--
-- A table rather than `max(right(uid,4)) + 1`, because two approvals a second
-- apart would read the same maximum and mint the same UID. One row, locked by
-- the update that increments it, so the database serialises what the office
-- cannot.
create table if not exists uid_sequence (
  id      boolean     primary key default true check (id),
  next    integer     not null,
  updated_at timestamptz not null default now()
);


-- ------------------------------------------------------------- corrections --
--
-- A student saying "that is not my name" -- or date of birth, class, stream or
-- school.
--
-- `students` is built from the master workbook, and every earlier correction
-- made only in the database was silently reverted by the next reseed. Two
-- things here stop that happening again. Every approved correction is kept as a
-- row, so scripts/seed-students.ts can put it back after any reseed; and every
-- one can be exported, so the workbook itself can be brought into line and the
-- two sources stop disagreeing.
--
-- One row per FIELD, not per request. A student who asks to change their name
-- and their class has asked two questions, and the office may be sure of one
-- and not the other.

create table if not exists app_corrections (
  id           bigserial   primary key,
  uid          char(9)     not null references students (uid),
  field        text        not null check (field in ('name', 'dob', 'class', 'stream', 'school')),
  -- What the register said when the request was made. Stored, because the
  -- register may change before anybody looks, and the office has to judge the
  -- request against what the student actually saw.
  old_value    text,
  -- For 'school' this is the pair 'CTR-13|SC-04', because a school is the pair
  -- and never its code alone. The UID does NOT change when a school does: a UID
  -- is who the child is, not where they sit, and changing it would orphan every
  -- mark they have.
  new_value    text        not null,
  note         text,
  status       text        not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   text        references admin_staff (staff_id),
  reason       text
);

-- One open question per field per student: asking again replaces nothing, it
-- is simply refused until the first is answered.
create unique index if not exists app_corrections_one_open
  on app_corrections (uid, field) where status = 'pending';
create index if not exists app_corrections_pending_idx
  on app_corrections (requested_at) where status = 'pending';
create index if not exists app_corrections_approved_idx
  on app_corrections (decided_at) where status = 'approved';


-- --------------------------------------------------------- video overrides --
--
-- A video the office has changed on a chapter.
--
-- The teaching content lives in JSON files in the repo, and a deployed site
-- cannot write to its own files -- so an Upload button has nowhere to put
-- anything. Videos are YouTube links, not files, which makes them the one piece
-- of content that can be controlled from the control centre cheaply: this table
-- is consulted over the top of the file. The file stays the record of what was
-- reviewed; this is what the office has changed since.
--
-- A row with video_id NULL means "this chapter has no video", which is how a
-- bad video is taken down. Deleting the row restores the file's video.

create table if not exists content_video_overrides (
  bucket      text        not null,   -- '<class>|<stream>|<section>', as the question bank has it
  chapter     text        not null,
  video_id    text,                   -- 11-character YouTube id, or null to remove
  language    text,
  start_at    integer,                -- seconds into the video
  set_by      text        not null references admin_staff (staff_id),
  set_at      timestamptz not null default now(),
  primary key (bucket, chapter)
);


-- ------------------------------------------------------------- check-in --
--
-- Phase 2 is sat in the app, in a hall, under invigilators. A student is marked
-- present by scanning the code on the invigilator's screen with their own phone,
-- and the paper will not open for anyone who has not -- which is what stops the
-- paper being sat from home. Ruled 14 September 2026: the code ROTATES every 30
-- seconds, so a photograph sent to a friend is dead by the time it arrives. See
-- src/lib/exam/checkin.ts.

-- Who may run the desk at a centre for a paper. Ordinary staff accounts -- an
-- invigilator is a teacher account assigned here -- so nobody needs a new kind
-- of login, and every check-in they oversee is attributable to a named person.
-- An admin may run any desk without being assigned.
create table if not exists exam_invigilators (
  exam_paper_id bigint      not null references exam_papers (id),
  centre_code   text        not null,
  staff_id      text        not null references admin_staff (staff_id),
  assigned_at   timestamptz not null default now(),
  assigned_by   text        not null,
  primary key (exam_paper_id, centre_code, staff_id)
);

create index if not exists exam_invigilators_staff_idx on exam_invigilators (staff_id);

-- One row per student per paper: present, at which centre, when, how.
--
-- `centre_code` is where they SCANNED, which is usually but not always the
-- centre on their record. A child who turns up at the wrong hall is still
-- checked in -- refusing a fourteen-year-old at the door on exam morning is
-- worse than a flag on the office's board -- and the board shows the mismatch.
create table if not exists exam_checkins (
  uid           char(9)     not null references students (uid),
  exam_paper_id bigint      not null references exam_papers (id),
  centre_code   text        not null,
  checked_in_at timestamptz not null default now(),
  method        text        not null check (method in ('qr', 'code')),
  device_id     text,
  primary key (uid, exam_paper_id)
);

create index if not exists exam_checkins_centre_idx on exam_checkins (exam_paper_id, centre_code);
