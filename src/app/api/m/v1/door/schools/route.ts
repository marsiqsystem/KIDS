import { json } from "@/lib/app/mobile-api";
import { listSchools } from "@/lib/app/registrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The schools a new student registers under — the website's register page's
 * list. Chosen from, never typed: a school is the pair (centre_code,
 * school_code), and its name is copied from the register on approval, so
 * registration cannot introduce a new spelling. No session: a child
 * registering has none yet.
 */
export async function GET() {
  return json({ ok: true, schools: await listSchools() });
}
