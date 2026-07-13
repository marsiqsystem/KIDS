import { neon } from "@neondatabase/serverless";

/**
 * The exam database (Neon Postgres, Singapore).
 *
 * Neon's HTTP driver, not a TCP pool: each Vercel function invocation is its own
 * short-lived process, and a pooled TCP client in that world opens a fresh
 * connection per invocation and exhausts the server's connection limit under
 * load. Over HTTP there is no connection to exhaust. That matters on 19 July,
 * when ~10,000 students hit these functions inside a 30-minute window.
 */
function connectionString(): string {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_POSTGRES_URL;

  if (!url) {
    throw new Error(
      "No Postgres connection string. Expected DATABASE_URL (run `vercel env pull .env.local`).",
    );
  }
  return url;
}

export const sql = neon(connectionString());

export type StudentClass = "IX" | "X" | "XI" | "XII";

export interface Student {
  uid: string;
  name: string;
  class: StudentClass;
  stream: string | null;
  school_code: string;
  school_name: string;
  centre_code: string;
  centre_name: string;
  dob: string | null;
  is_demo: boolean;
}

/** The student behind a Unique ID, or null if that ID was never issued. */
export async function findStudent(uid: string): Promise<Student | null> {
  const rows = (await sql`
    select uid, name, class, stream, school_code, school_name,
           centre_code, centre_name, dob, is_demo
    from students
    where uid = ${uid}
  `) as Student[];

  return rows[0] ?? null;
}
