/**
 * The boards shown on stage after the publish button is held.
 *
 * ⚠️ SERVER ONLY, and read straight from `offline_results` — the same snapshot
 * the student portal reads. The stage and the portal must never disagree: a
 * child whose name is read out on stage will open their phone in the next
 * minute, and the two numbers have to be the same number.
 *
 * Every list here is "highest marks first, then the lower roll number", so a
 * tie resolves the same way every time this page is opened. Ties are NOT shared
 * on stage the way ranks are on a marksheet — a podium has three steps.
 */
import { sql } from "./db";
import { CENTRES } from "@/lib/centres";

export interface Entry {
  rank: number;
  name: string;
  school: string;
  centre: string;
  className: string;
  stream: string;
  marks: number;
  percent: string;
  /** Set on the "best of each X" boards — the district, zone, school or centre. */
  anchor?: string;
}

export type BoardKind = "overview" | "podium" | "columns" | "list" | "finale";

export interface Board {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  count: string;
  kind: BoardKind;
  entries: Entry[];
}

export interface StageData {
  eventDate: string;
  overview: {
    appeared: number; marked: number; highest: number;
    average: number; centres: number; schools: number;
  };
  boards: Board[];
}

/** CTR-01..11 Kolkata, 12..15 Suburb, 16..21 Asansol — the register's own split. */
const ZONES: [string, number, number][] = [
  ["Kolkata Zone", 1, 11],
  ["Kolkata Suburb Zone", 12, 15],
  ["Asansol Zone", 16, 21],
];
function zoneOf(centreCode: string): string {
  const n = Number(centreCode.split("-")[1]);
  return ZONES.find(([, lo, hi]) => n >= lo && n <= hi)?.[0] ?? "Other";
}

/**
 * The district, not the locality. The centre register writes
 * "Garden Reach, Kolkata" — the part after the last comma is the district, and
 * a bare "Purulia" is already one.
 */
function districtOf(centreCode: string): string {
  const raw = CENTRES[centreCode.slice(-2)]?.district ?? "";
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1] || "Unknown";
  // A few centres are filed as "Central Kolkata" with no comma at all. Left
  // alone that reads on stage as a district of its own, next to Kolkata.
  return /kolkata$/i.test(last) ? "Kolkata" : last;
}

interface Row {
  uid: string; name: string; class: string; stream: string | null;
  school_name: string; centre_code: string; centre_name: string;
  marks: number; total_q: number;
}

const CLASS_ORDER = ["IX", "X", "XI", "XII"];
const num = (n: number) => n.toLocaleString("en-IN");

/** Highest first; a tie goes to the lower Unique ID, so the order never drifts. */
const best = (a: Row, b: Row) => b.marks - a.marks || a.uid.localeCompare(b.uid);

function entry(r: Row, rank: number, anchor?: string): Entry {
  return {
    rank,
    name: r.name,
    school: r.school_name,
    centre: `${r.centre_code} ${r.centre_name}`,
    className: r.class,
    stream: r.stream ?? "",
    marks: r.marks,
    percent: r.total_q ? ((100 * r.marks) / r.total_q).toFixed(1) : "0.0",
    anchor,
  };
}

/** One board of "the best of each X", one name per group, groups ordered by that name's marks. */
function bestOfEach(
  rows: Row[],
  groupBy: (r: Row) => string,
  detail: (r: Row) => string,
): Entry[] {
  const top = new Map<string, Row>();
  for (const r of rows) {
    const g = groupBy(r);
    if (!g) continue;
    const held = top.get(g);
    if (!held || best(r, held) < 0) top.set(g, r);
  }
  return [...top.entries()]
    .sort(([, a], [, b]) => best(a, b))
    .map(([g, r], i) => ({ ...entry(r, i + 1, g), school: detail(r) }));
}

/**
 * Everything the stage needs, in one read.
 *
 * Absentees are not in `offline_results` at all, so nothing here has to filter
 * them out — the table is exactly the students who sat and were marked.
 */
export async function stageData(eventDate: string): Promise<StageData> {
  const rows = (await sql`
    select o.uid, o.class, o.stream, o.marks, o.total_q,
           s.name, s.school_name, s.centre_code, s.centre_name
    from offline_results o
    join students s on s.uid = o.uid
  `) as unknown as Row[];

  const sorted = [...rows].sort(best);
  const enrolled = (await sql`select count(*)::int as n from students`) as unknown as { n: number }[];

  const overview = {
    appeared: rows.length,
    marked: rows.length,
    highest: sorted[0]?.marks ?? 0,
    average: rows.length ? rows.reduce((a, r) => a + r.marks, 0) / rows.length : 0,
    centres: new Set(rows.map((r) => r.centre_code)).size,
    schools: new Set(rows.map((r) => r.school_name)).size,
  };

  const boards: Board[] = [
    {
      id: "overview", eyebrow: "The Examination", title: "SET 2026 at a Glance",
      subtitle: `Students Evaluation Test · Project UDAAN · ${overview.centres} centres across ${
        new Set(rows.map((r) => districtOf(r.centre_code))).size} districts`,
      count: `${num(rows.length)} sheets assessed of ${num(enrolled[0]?.n ?? rows.length)} enrolled`,
      kind: "overview", entries: [],
    },
  ];

  // ---- one podium per class, in class order ----
  for (const cls of CLASS_ORDER) {
    const inClass = sorted.filter((r) => r.class === cls);
    if (!inClass.length) continue;
    boards.push({
      id: `class-${cls.toLowerCase()}`, eyebrow: "Class Toppers", title: `Class ${cls}`,
      subtitle: cls === "XI" || cls === "XII"
        ? `Highest aggregate in Class ${cls} · stream shown against each name`
        : `Highest aggregate in Class ${cls}`,
      count: `top 10 of ${num(inClass.length)} candidates`,
      kind: "podium",
      entries: inClass.slice(0, 10).map((r, i) => entry(r, i + 1)),
    });
  }

  // ---- streams, XI and XII together ----
  // Eight rows carry the string "Nan" where the enrolment workbook had an empty
  // cell. It is not a stream and must never head a board of its own.
  const STREAMS = ["Science", "Commerce", "Arts"];
  const streamed = sorted.filter((r) => r.stream && STREAMS.includes(r.stream));
  if (streamed.length) {
    boards.push({
      id: "streams", eyebrow: "Stream Toppers", title: "Best of Each Stream",
      subtitle: "Classes XI and XII taken together",
      count: `${new Set(streamed.map((r) => r.stream)).size} of ${num(streamed.length)} candidates`,
      kind: "columns",
      entries: bestOfEach(streamed, (r) => r.stream ?? "",
        (r) => `${r.school_name} · ${r.class} · ${r.centre_code}`),
    });
  }

  const withDetail = (r: Row) =>
    `Class ${r.class}${r.stream ? ` · ${r.stream}` : ""} · ${r.centre_code}`;

  boards.push({
    id: "zones", eyebrow: "Zone Toppers", title: "Best of Each Zone",
    subtitle: "Kolkata · Kolkata Suburb · Asansol",
    count: `${new Set(rows.map((r) => zoneOf(r.centre_code))).size} zones · one topper each`,
    kind: "list",
    entries: bestOfEach(sorted, (r) => zoneOf(r.centre_code),
      (r) => `${r.school_name} · ${withDetail(r)}`),
  });

  boards.push({
    id: "districts", eyebrow: "District Toppers", title: "Best of Each District",
    subtitle: "Across every district the examination reached",
    count: `${new Set(rows.map((r) => districtOf(r.centre_code))).size} districts · one topper each`,
    kind: "list",
    entries: bestOfEach(sorted, (r) => districtOf(r.centre_code),
      (r) => `${r.school_name} · ${withDetail(r)}`),
  });

  boards.push({
    id: "centres", eyebrow: "Centre Toppers", title: "Best of Each Centre",
    subtitle: "Every examination centre, in order of its highest score",
    count: `${overview.centres} centres · one topper each`,
    kind: "list",
    entries: bestOfEach(sorted, (r) => `${r.centre_code} ${r.centre_name}`,
      (r) => `${r.school_name} · ${withDetail(r)}`),
  });

  // Schools are the long tail — 200-odd of them. Fifteen is what fits on a
  // board and what an audience will still be listening to at the end of.
  boards.push({
    id: "schools", eyebrow: "School Toppers", title: "Best of Each School",
    subtitle: "Leading schools by their highest-scoring candidate",
    count: `top 15 of ${overview.schools} schools`,
    kind: "list",
    entries: bestOfEach(sorted, (r) => r.school_name, withDetail).slice(0, 15),
  });

  boards.push({
    id: "finale", eyebrow: "The Finale", title: "Overall Toppers of SET 2026",
    subtitle: "The first three of the entire examination, regardless of class",
    count: `top 3 of ${num(rows.length)} candidates`,
    kind: "finale",
    entries: sorted.slice(0, 3).map((r, i) => entry(r, i + 1)),
  });

  return { eventDate, overview, boards: boards.filter((b) => b.kind === "overview" || b.entries.length) };
}
