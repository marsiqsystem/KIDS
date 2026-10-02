"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeQuestionSetAction } from "@/app/admin/actions";
import ConfirmDialog from "./ConfirmDialog";

/** "Take off" for a loaded set nobody has sat. Board 17 A2. */
export function SetRowActions({ paperId, code, name }: { paperId: string; code: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setAsking(true)}
        className="h-[34px] rounded-[9px] px-2.5 text-[12.5px] font-semibold text-[#7B1E2B] hover:bg-[#F6E9E9] disabled:opacity-50"
      >
        Take off
      </button>
      {error ? <span className="text-xs text-[#B22234]">{error}</span> : null}
      <ConfirmDialog
        open={asking}
        title={`Take ${name} off the paper?`}
        cancel="Keep it"
        confirm="Take it off"
        busy={pending}
        onCancel={() => setAsking(false)}
        onConfirm={() =>
          start(async () => {
            const r = await removeQuestionSetAction(paperId, code);
            setAsking(false);
            if (!r.ok) setError(r.message);
            else router.refresh();
          })
        }
      >
        Its students will see no paper until a set is loaded again. Nobody has sat it.
      </ConfirmDialog>
    </>
  );
}
