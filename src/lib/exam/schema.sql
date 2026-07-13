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
  ip            text
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
  kind       text        not null,   -- scan | start | sync | submit | autosubmit | reset | blur
  at         timestamptz not null default now(),
  detail     jsonb
);

create index if not exists exam_events_uid_idx on exam_events (uid, at);
