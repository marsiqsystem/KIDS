import { requireStudent } from "@/lib/app/gate";
import { findAccount } from "@/lib/app/accounts";
import DeleteAccountForm from "@/components/app/DeleteAccountForm";
import { Head } from "@/components/app/kit";
import { groupUid } from "@/lib/app/uid";
import "../../../profile.css";

/**
 * Delete my account — what goes and what stays, said BEFORE the button, as both
 * app stores require and as Umar ruled on 9 Oct 2026. See deleteAppAccount.
 */
export const dynamic = "force-dynamic";

export default async function DeleteAccountPage() {
  const student = await requireStudent();
  const issued = (await findAccount(student.uid))?.must_change ?? false;

  return (
    <>
      <Head title="Delete my account" back="/app/profile" />
      <p className="k-line k-mono">{groupUid(student.uid)}</p>

      <div className="k-card">
        <div className="k-label">Deleted at once</div>
        <ul className="k-line" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          <li>Your app account and password, and every phone signed in to it</li>
          <li>Your practice: answers, streak and chosen subjects</li>
          <li>What you have read, and your coaching day&rsquo;s ticks</li>
        </ul>
      </div>
      <div className="k-card">
        <div className="k-label">Kept by KIDS</div>
        <p className="k-line" style={{ marginTop: 8 }}>
          Your name on the register and your exam results. They are the institute&rsquo;s record of the papers you sat, and
          deleting the app does not remove them.
        </p>
        <p className="k-line">To use the app again later, claim your account afresh. You start with nothing practised.</p>
      </div>

      <DeleteAccountForm needsPassword={!issued} />
    </>
  );
}
