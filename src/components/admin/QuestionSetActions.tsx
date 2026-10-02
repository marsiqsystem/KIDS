"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeQuestionSetAction } from "@/app/admin/actions";

/** "Take off the paper" for a loaded set nobody has sat. */
export function SetRowActions({ paperId, code }: { paperId: string; code: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Take ${code} off the paper? Students of this set will see no paper open until a set is loaded again.`)) return;
          start(async () => {
            const r = await removeQuestionSetAction(paperId, code);
            if (!r.ok) setError(r.message);
            else router.refresh();
          });
        }}
        className="rounded border border-[#E8C9CC] px-2.5 py-1 text-xs text-[#B22234] hover:bg-[#FBE9EA] disabled:opacity-50"
      >
        {pending ? "…" : "Take off the paper"}
      </button>
      {error ? <span className="text-xs text-[#B22234]">{error}</span> : null}
    </>
  );
}
