import { json, mobileStudent } from "@/lib/app/mobile-api";
import { resultViewProps } from "@/lib/exam/result-page";
import { practiceLine } from "@/lib/app/record";
import { awardFor, laterResultsFor } from "@/lib/exam/later-results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * My Record, for the native app — the website's /app/record.
 *
 * `result` is resultViewProps, the very object the portal and the website's
 * Record tab hand to <ResultView>, so the phone shows the one published result
 * and not a second opinion about it. It is a plain read of published
 * snapshots; nothing here computes a mark.
 *
 * The marksheet link is made absolute, because the phone opens it in its own
 * browser rather than inside this site.
 */
export async function GET(request: Request) {
  const { student, refuse } = await mobileStudent();
  if (refuse) return refuse;

  const [result, practice, later, award] = await Promise.all([
    resultViewProps(student),
    practiceLine(student.uid),
    laterResultsFor(student),
    awardFor(student),
  ]);

  return json({
    ok: true,
    result: { ...result, marksheetHref: new URL(result.marksheetHref, request.url).toString() },
    practice,
    later,
    award,
  });
}
