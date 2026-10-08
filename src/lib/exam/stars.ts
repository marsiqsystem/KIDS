import { sql } from "@/lib/exam/db";

/**
 * Stars — the invigilator's warnings during a paper, up to three.
 *
 * Umar's ask, 8 Oct 2026: a student caught at mischief is warned and given a
 * star, like a wanted level. What a star, or three, leads to is not decided
 * yet, so this keeps the count and nothing acts on it. The student never sees
 * it. Each change is audited by the caller (admin_events), so a star taken
 * back is still on record.
 */

export const MAX_STARS = 3;

export interface StarRow {
  uid: string;
  name: string;
  class: string;
  stars: number;
  updated_at: Date;
}

/**
 * Add or take back one star. Returns the new count, or null when the student
 * is not at this desk — checked in here, or registered here — so a desk cannot
 * star a child in another hall.
 */
export async function changeStars(
  uid: string,
  examPaperId: string,
  centre: string,
  by: 1 | -1,
  staffId: string,
): Promise<number | null> {
  const rows = (await sql`
    insert into exam_stars (uid, exam_paper_id, centre_code, stars, updated_by)
    select s.uid, ${examPaperId}::bigint, ${centre}, greatest(0, least(${MAX_STARS}::int, ${by}::int)), ${staffId}
      from students s
      left join exam_checkins c on c.uid = s.uid and c.exam_paper_id = ${examPaperId}::bigint
     where s.uid = ${uid} and (s.centre_code = ${centre} or c.centre_code = ${centre})
    on conflict (uid, exam_paper_id) do update
       set stars       = greatest(0, least(${MAX_STARS}::int, exam_stars.stars + ${by}::int)),
           centre_code = excluded.centre_code,
           updated_by  = excluded.updated_by,
           updated_at  = now()
    returning stars
  `) as { stars: number }[];
  return rows.length ? rows[0].stars : null;
}

/** Everyone holding a star at this desk, most stars first. */
export async function deskStarList(examPaperId: string, centre: string): Promise<StarRow[]> {
  return (await sql`
    select s.uid, s.name, s.class, x.stars, x.updated_at
      from exam_stars x
      join students s on s.uid = x.uid
     where x.exam_paper_id = ${examPaperId}::bigint and x.centre_code = ${centre} and x.stars > 0
     order by x.stars desc, x.updated_at desc
  `) as StarRow[];
}
