import { sql } from "@/lib/exam/db";
import { resetAppPassword } from "./app-passwords";

/**
 * Who has the app, and who does not yet.
 *
 * The most useful sheet the office can hold between now and December: a
 * student who has not claimed cannot see an admit card or sit Phase 2 in the
 * app, and the only people who can chase them are their schools. So this is
 * counted per school, and a school's unclaimed list is one click away.
 *
 * Every count excludes `is_demo`. A school told "59 of 60 have claimed" when
 * one of the 60 is the KIDS team's own test account has been told something
 * false.
 */

export interface SchoolClaims {
  centre_code: string;
  centre_name: string;
  school_code: string;
  school_name: string;
  enrolled: number;
  /**
   * The child has chosen their own password. NOT merely "has an account row":
   * an office-issued password creates the row too, and counting that as claimed
   * would tell a school its children are on the app when not one has opened it.
   */
  claimed: number;
  /** An office password was issued and has not been used yet. */
  issued: number;
  /** No account, no date of birth: they cannot claim by themselves at all. */
  locked_out: number;
}

export async function claimsBySchool(): Promise<SchoolClaims[]> {
  return (await sql`
    select s.centre_code, s.centre_name, s.school_code, s.school_name,
           count(*)::int                                                   as enrolled,
           count(*) filter (where a.uid is not null and not a.must_change)::int as claimed,
           count(*) filter (where a.must_change)::int                        as issued,
           count(*) filter (where a.uid is null and s.dob is null)::int      as locked_out
      from students s
      left join app_accounts a on a.uid = s.uid
     where not s.is_demo
     group by s.centre_code, s.centre_name, s.school_code, s.school_name
     order by (count(*) filter (where a.uid is not null and not a.must_change))::float / count(*) asc,
              count(*) desc
  `) as SchoolClaims[];
}

export interface ClaimTotals {
  enrolled: number;
  claimed: number;
  issued: number;
  lockedOut: number;
  claimedThisWeek: number;
}

export async function claimTotals(): Promise<ClaimTotals> {
  const [r] = (await sql`
    select count(*)::int                                                        as enrolled,
           count(*) filter (where a.uid is not null and not a.must_change)::int as claimed,
           count(*) filter (where a.must_change)::int                          as issued,
           count(*) filter (where a.uid is null and s.dob is null)::int        as locked_out,
           count(*) filter (where not a.must_change
                              and a.password_set_at > now() - interval '7 days')::int as this_week
      from students s
      left join app_accounts a on a.uid = s.uid
     where not s.is_demo
  `) as { enrolled: number; claimed: number; issued: number; locked_out: number; this_week: number }[];
  return {
    enrolled: r.enrolled,
    claimed: r.claimed,
    issued: r.issued,
    lockedOut: r.locked_out,
    claimedThisWeek: r.this_week,
  };
}

export interface UnclaimedRow {
  uid: string;
  name: string;
  class: string;
  stream: string | null;
  has_dob: boolean;
}

export async function unclaimedAtSchool(centre: string, school: string): Promise<UnclaimedRow[]> {
  return (await sql`
    select s.uid, s.name, s.class, s.stream, (s.dob is not null) as has_dob
      from students s
      left join app_accounts a on a.uid = s.uid
     where not s.is_demo and a.uid is null
       and s.centre_code = ${centre} and s.school_code = ${school}
     order by s.class, s.name
  `) as UnclaimedRow[];
}

/** Per press. See openLockedOutAtSchool. */
export const BATCH = 60;

export interface IssuedSheetRow {
  uid: string;
  name: string;
  class: string;
  password: string;
}

/**
 * Open every locked-out account at one school, and hand back the sheet.
 *
 * 1,061 children on the register have no date of birth, and the claim screen's
 * only check is the date of birth -- so they cannot open their own account at
 * all. One at a time through the Students tab that is weeks of clicking. A
 * school's worth at once, printed and sent to the class teacher, is how the
 * five coaching students were done in September, at the scale of the register.
 *
 * Every password is one-time: the app makes the child choose their own before
 * anything else (`must_change`). They exist in this response and nowhere else,
 * so the sheet must be printed or saved before the page is left.
 *
 * Sixty per press, sequential. Each one is a deliberately slow password hash and
 * an audited write, and the largest school has 239 locked out (counted
 * 13 September 2026) -- a single request for all of them risks timing out half
 * way, leaving the office holding a sheet that does not match what was issued.
 * Pressing again takes the next sixty, because a child given a password is no
 * longer unclaimed.
 */
export async function openLockedOutAtSchool(
  centre: string,
  school: string,
  by: string,
): Promise<IssuedSheetRow[]> {
  const rows = (await unclaimedAtSchool(centre, school)).filter((r) => !r.has_dob).slice(0, BATCH);
  const sheet: IssuedSheetRow[] = [];
  for (const r of rows) {
    const issued = await resetAppPassword(r.uid, by);
    sheet.push({ uid: r.uid, name: r.name, class: r.class, password: issued.password });
  }
  return sheet;
}
