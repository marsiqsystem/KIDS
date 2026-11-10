"use client";

import { startTransition, useActionState, useState } from "react";
import { X } from "lucide-react";
import {
  addSchoolAction,
  moveSchoolAction,
  removeSchoolAction,
  renameSchoolAction,
} from "@/app/admin/actions";
import type { CentreChoice, District, SchoolAdminRow } from "@/lib/admin/schools";
import { Alert, INPUT, RowAction, SURFACE, Submit } from "./ui";

/**
 * The school list, kept by the office (10 Nov 2026): add a school at a centre
 * or a new one, move a school and everybody registered there to another
 * centre, and rename or remove a school the office added.
 *
 * Codes are never typed. The office names schools and centres; the library
 * (src/lib/admin/schools.ts) picks the next CTR and SC numbers and the UID
 * prefix, and refuses one that is already in use.
 */
export default function SchoolsPanel({
  schools,
  centres,
  districts,
}: {
  schools: SchoolAdminRow[];
  centres: CentreChoice[];
  districts: District[];
}) {
  const byCentre = new Map<string, SchoolAdminRow[]>();
  for (const s of schools) byCentre.set(s.centre_code, [...(byCentre.get(s.centre_code) ?? []), s]);

  return (
    <div className="space-y-4">
      <AddSchool centres={centres} districts={districts} />
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[#2B1A1C]">Schools at each centre</h3>
        {centres.map((c) => {
          const list = (byCentre.get(c.centre_code) ?? []).filter((s) => s.school_code !== "SC-99");
          return (
            <details key={c.centre_code} className={`rounded ${SURFACE}`}>
              <summary className="cursor-pointer px-4 py-2 text-sm">
                <span className="font-mono text-xs text-[#6B5B5D]">{c.centre_code}</span>{" "}
                <span className="text-[#2B1A1C]">{c.centre_name}</span>{" "}
                <span className="text-xs text-[#6B5B5D]">· {list.length} school{list.length === 1 ? "" : "s"}</span>
              </summary>
              <ul className="divide-y divide-[#F2E9DA] border-t border-[#F2E9DA]">
                {list.map((s) => (
                  <SchoolRow key={`${s.centre_code}|${s.school_code}`} s={s} centres={centres} />
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- add one --- */

function AddSchool({ centres, districts }: { centres: CentreChoice[]; districts: District[] }) {
  const [state, action] = useActionState(addSchoolAction, {});
  const [centre, setCentre] = useState("");
  const isNew = centre === "new";

  return (
    <form
      key={state.ok ? state.message : "form"}
      onSubmit={(e) => {
        // By hand, so a refusal keeps the typed name (React clears a form
        // after an action runs); a new key after each add starts empty.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className={`rounded p-4 ${SURFACE} grid gap-3 sm:grid-cols-2`}
    >
      <h3 className="text-sm font-bold text-[#2B1A1C] sm:col-span-2">Add a school</h3>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">School name · as it should appear to families</span>
        <input name="name" required maxLength={120} placeholder="e.g. Kharagpur Azizia High School" className={INPUT} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">Centre · where its students sit</span>
        <select name="centre" required value={centre} onChange={(e) => setCentre(e.target.value)} className={INPUT}>
          <option value="" disabled>Pick a centre…</option>
          {centres.map((c) => (
            <option key={c.centre_code} value={c.centre_code}>
              {c.centre_code} · {c.centre_name}
            </option>
          ))}
          <option value="new">+ A new centre…</option>
        </select>
      </label>
      {isNew ? (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">New centre&rsquo;s name</span>
            <input name="newCentre" required maxLength={120} placeholder="usually the school that hosts it" className={INPUT} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">
              District · the first digit of every User ID made there
            </span>
            <select name="digit" required defaultValue="" className={INPUT}>
              <option value="" disabled>Pick the district — the same as these centres…</option>
              {districts.map((d) => (
                <option key={d.digit} value={d.digit}>
                  {d.digit} · {d.centres.slice(0, 3).join(", ")}{d.centres.length > 3 ? ` +${d.centres.length - 3}` : ""}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit>Add school</Submit>
        <span className="text-xs text-[#6B5B5D]">
          Families can pick it on Register at once. The codes are given automatically. It is logged.
        </span>
      </div>
      <div className="sm:col-span-2">
        <Alert state={state} />
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- one row --- */

function SchoolRow({ s, centres }: { s: SchoolAdminRow; centres: CentreChoice[] }) {
  const [open, setOpen] = useState<"" | "move" | "rename">("");
  const pair = `${s.centre_code}|${s.school_code}`;
  const empty = s.students === 0 && s.applying === 0;

  return (
    <li className="px-4 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-xs text-[#6B5B5D]">{s.school_code}</span>
        <span className="text-[#2B1A1C]">{s.school_name}</span>
        <span className="text-xs text-[#6B5B5D]">
          {s.students} registered{s.applying ? ` · ${s.applying} applying` : ""}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOpen(open === "move" ? "" : "move")} className={ROW_BTN}>
            Move
          </button>
          {s.added ? (
            <button type="button" onClick={() => setOpen(open === "rename" ? "" : "rename")} className={ROW_BTN}>
              Rename
            </button>
          ) : null}
          {s.added && empty ? (
            <RowAction
              action={removeSchoolAction}
              fields={{ school: pair }}
              danger
              confirm={`Remove ${s.school_name} from the list? Nobody is registered or applying there.`}
            >
              Remove
            </RowAction>
          ) : null}
        </span>
      </div>
      {open === "move" ? <MoveForm s={s} centres={centres} onClose={() => setOpen("")} /> : null}
      {open === "rename" ? <RenameForm s={s} onClose={() => setOpen("")} /> : null}
    </li>
  );
}

const ROW_BTN = "rounded border border-[#E3D6C4] px-2.5 py-1 text-xs text-[#4A3A3C] hover:bg-[#F6E9E9]";

function MoveForm({ s, centres, onClose }: { s: SchoolAdminRow; centres: CentreChoice[]; onClose: () => void }) {
  const [state, action] = useActionState(moveSchoolAction, {});
  const [centre, setCentre] = useState("");
  const who = s.students
    ? `${s.students} registered student${s.students === 1 ? "" : "s"} move with it. Their User IDs do not change.`
    : "Nobody is registered there yet.";

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Move ${s.school_name} to another centre? ${who}`)) e.preventDefault();
      }}
      className="mt-2 grid gap-2 rounded border border-[#E3D6C4] bg-[#FDFBF7] p-3 sm:grid-cols-[1fr_1fr_auto]"
    >
      <input type="hidden" name="school" value={`${s.centre_code}|${s.school_code}`} />
      <select name="centre" required value={centre} onChange={(e) => setCentre(e.target.value)} className={INPUT}>
        <option value="" disabled>Move to…</option>
        {centres
          .filter((c) => c.centre_code !== s.centre_code)
          .map((c) => (
            <option key={c.centre_code} value={c.centre_code}>
              {c.centre_code} · {c.centre_name}
            </option>
          ))}
        <option value="new">+ A new centre…</option>
      </select>
      {centre === "new" ? (
        <input name="newCentre" required maxLength={120} placeholder="New centre's name" className={INPUT} />
      ) : (
        <span className="self-center text-xs text-[#6B5B5D]">{who}</span>
      )}
      <span className="flex items-center gap-2">
        <Submit>Move</Submit>
        <button type="button" onClick={onClose} aria-label="Close" className="text-[#6B5B5D]">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </span>
      <div className="sm:col-span-3">
        <Alert state={state} />
      </div>
    </form>
  );
}

function RenameForm({ s, onClose }: { s: SchoolAdminRow; onClose: () => void }) {
  const [state, action] = useActionState(renameSchoolAction, {});
  return (
    <form action={action} className="mt-2 grid gap-2 rounded border border-[#E3D6C4] bg-[#FDFBF7] p-3 sm:grid-cols-[1fr_auto]">
      <input type="hidden" name="school" value={`${s.centre_code}|${s.school_code}`} />
      <input name="name" required maxLength={120} defaultValue={s.school_name} className={INPUT} />
      <span className="flex items-center gap-2">
        <Submit>Save name</Submit>
        <button type="button" onClick={onClose} aria-label="Close" className="text-[#6B5B5D]">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </span>
      <p className="text-xs text-[#6B5B5D] sm:col-span-2">
        Its students and any open applications take the new name too.
      </p>
      <div className="sm:col-span-2">
        <Alert state={state} />
      </div>
    </form>
  );
}
