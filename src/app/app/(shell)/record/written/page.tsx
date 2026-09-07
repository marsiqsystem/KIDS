import { redirect } from "next/navigation";

/**
 * The written paper used to have its own screen in the app. It does not any
 * more: My Record now shows the portal's `<ResultView>`, which opens either
 * marksheet from its own landing and does it far better than this page did.
 *
 * Kept as a redirect rather than deleted. Notices link here by path, a student
 * may have the URL open in a second tab, and a 404 is a worse answer than the
 * page they were looking for.
 */
export default function WrittenRedirect() {
  redirect("/app/record");
}
