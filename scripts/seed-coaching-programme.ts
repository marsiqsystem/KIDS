/**
 * Create a coaching programme and its day, for one batch.
 *
 *   node --env-file=.env.local scripts/seed-coaching-programme.ts 7
 *   node --env-file=.env.local scripts/seed-coaching-programme.ts 7 --starts=2026-09-15
 *   node --env-file=.env.local scripts/seed-coaching-programme.ts 7 --status
 *   node --env-file=.env.local scripts/seed-coaching-programme.ts 7 --archive
 *   node --env-file=.env.local scripts/seed-coaching-programme.ts 7 --restore
 *
 * This exists because the teacher's build-the-day screen is Design's turn 8
 * PART TWO and is not built. The day has to come from somewhere in the
 * meantime, and it should come from one place that states the rulings rather
 * than from literals scattered through a component.
 *
 * When 8t arrives, that screen edits these same rows and this script becomes
 * what it should have been all along: the thing that makes the first one.
 *
 * The rulings it encodes, all Umar's, 11 September 2026:
 *
 *   * TWO blocks are fixed for all 65 — the 5:30 wake and the class. Everything
 *     else moves inside a window, because 65 children in 112 households have
 *     different school buses and different mothers who need help at seven.
 *   * The ritual is TEN MINUTES AT SIX, as briefed. Design argued that sixty of
 *     sixty-five would swipe it away and proposed two minutes at 5:31 attached
 *     to the wake; the institute overruled it. The argument is on the record in
 *     the Turn 8 file — if it is being skipped by week three, Design was right.
 *   * School is 10:30-4:30, six days, and the children do NOT take phones. So
 *     it carries ONE thing to read on the way in, and the lunchtime question
 *     that Design drew is dead.
 *   * Nothing rings during school and nothing inside it is counted.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("No DATABASE_URL. Run with: node --env-file=.env.local scripts/…");
  process.exit(1);
}
const sql = neon(url);

const args = process.argv.slice(2);
const batchId = args.find((a) => /^\d+$/.test(a));
const flag = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const statusOnly = args.includes("--status");
const archive = args.includes("--archive");
const restore = args.includes("--restore");

if (!batchId) {
  console.error("Which batch? e.g. `… seed-coaching-programme.ts 7`");
  process.exit(1);
}

/**
 * The spine. Order is the order of the day.
 *
 * `window` is the real field and `at` is the default inside it — Turn 8 is
 * explicit that a teacher sets a window per block, not a clock time. A fixed
 * block has a window of zero width, so "fixed" is a fact about the data and
 * not a second thing to keep in step with it.
 */
const SPINE: {
  kind: string;
  label: string;
  subtitle: string | null;
  at: string;
  window: [string, string];
  minutes: number | null;
  fixed?: true;
}[] = [
  {
    kind: "wake",
    label: "Woke up",
    subtitle: "Tap when you are up. The day starts here.",
    at: "05:30",
    window: ["05:30", "05:30"],
    minutes: null,
    fixed: true,
  },
  {
    kind: "ritual",
    label: "Sit still, ten minutes",
    subtitle: "Not a lesson. Sit, breathe, and count your breaths. Then the day starts.",
    at: "06:00",
    window: ["05:45", "07:00"],
    minutes: 10,
  },
  {
    kind: "revision",
    label: "Morning revision",
    subtitle: "Yesterday's chapter, read again",
    at: "06:15",
    window: ["05:45", "07:30"],
    minutes: 25,
  },
  {
    kind: "daily",
    label: "Your five questions",
    subtitle: "The same daily set as always · about three minutes",
    at: "07:10",
    window: ["06:00", "09:30"],
    minutes: null,
  },
  {
    kind: "school",
    label: "School",
    subtitle: "One idea to carry with you. Nothing rings and nothing is counted.",
    at: "10:30",
    window: ["10:30", "10:30"],
    minutes: null,
  },
  {
    kind: "class",
    label: "Live class",
    subtitle: "This is the one fixed hour of your day",
    at: "18:30",
    window: ["18:30", "18:30"],
    minutes: 90,
    fixed: true,
  },
  {
    kind: "homework",
    label: "Homework",
    subtitle: "You photograph your exercise book",
    at: "20:00",
    window: ["19:00", "21:30"],
    minutes: null,
  },
  {
    kind: "winddown",
    label: "Wind down",
    subtitle: "The app goes quiet until 5:30",
    at: "21:45",
    window: ["21:00", "22:30"],
    minutes: null,
  },
];

const batch = (await sql`
  select id::text, name from admin_batches where id = ${batchId}::bigint
`) as { id: string; name: string }[];

if (!batch[0]) {
  console.error(`No batch ${batchId}.`);
  process.exit(1);
}

const existing = (await sql`
  select id::text, name, starts_on, weeks from coaching_programmes
   where batch_id = ${batchId}::bigint and archived_at is null
`) as { id: string; name: string; starts_on: Date; weeks: number }[];

if (statusOnly) {
  console.log(`\n  batch ${batch[0].id} — ${batch[0].name}\n`);
  if (!existing[0]) {
    console.log("  no programme\n");
  } else {
    const blocks = (await sql`
      select kind, label, at_time, window_from, window_to, fixed
        from coaching_blocks where programme_id = ${existing[0].id}::bigint
         and removed_at is null order by sort
    `) as Record<string, unknown>[];
    console.log(`  ${existing[0].name} · ${existing[0].weeks} weeks\n`);
    for (const b of blocks) {
      const w = b.fixed ? "fixed" : `${b.window_from}–${b.window_to}`;
      console.log(`  ${String(b.at_time).slice(0, 5)}  ${String(b.label).padEnd(22)} ${w}`);
    }
    console.log();
  }
  process.exit(0);
}

/**
 * Stand a programme down, and put it back.
 *
 * `archived_at` was always in the schema and nothing could ever set it. A
 * programme can be postponed before it starts, and when that happened on
 * 13 September 2026 it left a live row whose day still had a 6:30 "Live class"
 * block in it, fixed, for a lesson that was not going to happen.
 *
 * Archiving is the honest answer and not a destructive one. `programmeFor()`
 * and the room both read `archived_at is null`, so one timestamp turns Home
 * back into the feed for all 66 rows and takes the room with it. Every block,
 * every mark a child has made and the whole presence history stay exactly
 * where they are, so `--restore` is the same switch the other way.
 *
 * Deleting the rows would also stop the day. It would also throw away the only
 * record of it, and there is no reason to.
 */
if (archive || restore) {
  if (archive && restore) {
    console.error("Pick one: --archive or --restore.");
    process.exit(1);
  }

  if (archive) {
    if (!existing[0]) {
      console.error(`Batch ${batchId} has no live programme. Nothing to archive.`);
      process.exit(1);
    }
    await sql`
      update coaching_programmes set archived_at = now()
       where id = ${existing[0].id}::bigint and archived_at is null
    `;
    const members = (await sql`
      select count(*)::int as n from admin_batch_members
       where batch_id = ${batchId}::bigint and removed_at is null
    `) as { n: number }[];
    console.log(`
  "${existing[0].name}" archived.`);
    console.log(`  ${members[0].n} students go back to the Home feed, and /app/room closes.`);
    console.log("  Nothing was deleted — blocks, marks and presence are all still there.");
    console.log(`  Put it back with: … seed-coaching-programme.ts ${batchId} --restore
`);
    process.exit(0);
  }

  if (existing[0]) {
    console.error(
      `Batch ${batchId} already has a LIVE programme ("${existing[0].name}").
` +
        "Archive that one first — the schema allows only one live programme per batch.",
    );
    process.exit(1);
  }

  // The most recently archived one, which is the one anybody means.
  const archived = (await sql`
    select id::text, name from coaching_programmes
     where batch_id = ${batchId}::bigint and archived_at is not null
     order by archived_at desc limit 1
  `) as { id: string; name: string }[];

  if (!archived[0]) {
    console.error(`Batch ${batchId} has no archived programme to restore.`);
    process.exit(1);
  }

  await sql`
    update coaching_programmes set archived_at = null where id = ${archived[0].id}::bigint
  `;
  console.log(`
  "${archived[0].name}" is live again. Check it with --status.
`);
  process.exit(0);
}

if (existing[0]) {
  console.error(
    `Batch ${batchId} already has a programme (“${existing[0].name}”).\n` +
      "Nothing has been changed. This script makes the FIRST one; editing a\n" +
      "running day belongs to the teacher's screen, not to a seed.",
  );
  process.exit(1);
}

/** Monday of the current week in IST, so a programme starts on a Monday. */
function nextMonday(): string {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

const startsOn = flag("starts") ?? nextMonday();
const weeks = Number(flag("weeks") ?? 14);

const made = (await sql`
  insert into coaching_programmes (batch_id, name, starts_on, weeks)
  values (${batchId}::bigint, ${batch[0].name}, ${startsOn}::date, ${weeks})
  returning id::text
`) as { id: string }[];

const programmeId = made[0].id;

for (const [i, b] of SPINE.entries()) {
  await sql`
    insert into coaching_blocks
      (programme_id, kind, label, subtitle, at_time, window_from, window_to, minutes, fixed, sort)
    values (${programmeId}::bigint, ${b.kind}, ${b.label}, ${b.subtitle},
            ${b.at}::time, ${b.window[0]}::time, ${b.window[1]}::time,
            ${b.minutes}, ${b.fixed ?? false}, ${i})
  `;
}

const members = (await sql`
  select count(*)::int as n from admin_batch_members
   where batch_id = ${batchId}::bigint and removed_at is null
`) as { n: number }[];

console.log(`\n  ${batch[0].name}`);
console.log(`  ${weeks} weeks from ${startsOn}, ${SPINE.length} blocks a day`);
console.log(`  ${members[0].n} students will see this instead of the Home feed\n`);
for (const b of SPINE) {
  const w = b.fixed
    ? "fixed for everyone"
    : b.kind === "school"
      ? "not counted, nothing rings"
      : `may move ${b.window[0]}–${b.window[1]}`;
  console.log(`  ${b.at}  ${b.label.padEnd(22)} ${w}`);
}
console.log();
