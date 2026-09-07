import { redirect } from "next/navigation";

/** See the note in ../written/page.tsx — both papers now live on My Record. */
export default function OnlineRedirect() {
  redirect("/app/record");
}
