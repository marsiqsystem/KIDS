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
  target_kind text,                   -- staff | batch | student
  target_id   text,
  detail      jsonb
);

create index if not exists admin_events_at_idx on admin_events (at desc);
create index if not exists admin_events_target_idx on admin_events (target_kind, target_id, at desc);
