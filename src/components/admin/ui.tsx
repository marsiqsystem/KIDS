"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Check, AlertCircle, Copy } from "lucide-react";
import type { State } from "@/app/admin/actions";

/**
 * The control centre's shared form parts.
 *
 * Small on purpose. Every screen behind the gate is an office tool used on a
 * laptop by two or three people, so it gets legibility and honest error
 * sentences rather than a design system.
 */

export const SURFACE = "border border-[#F2E9DA] bg-[#FFFFFF]";
export const INPUT =
  "w-full rounded border border-[#E3D6C4] bg-[#FDFBF7] px-3 py-2 text-sm text-[#2B1A1C] " +
  "outline-none placeholder:text-[#6B5B5D] focus:border-[#7B1E2B]";

export function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">{label}</span>
      <input
        className={INPUT}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
      />
      {hint ? <span className="mt-1 block text-xs text-[#6B5B5D]">{hint}</span> : null}
    </label>
  );
}

export function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded bg-[#7B1E2B] px-4 py-2 text-sm font-semibold
                 text-[#FDFBF7] disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Alert({ state }: { state: State }) {
  if (!state?.message) return null;
  const good = state.ok;
  return (
    <p
      role="status"
      className={`flex items-start gap-2 text-sm ${good ? "text-[#137565]" : "text-[#B22234]"}`}
    >
      {good ? (
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {state.message}
    </p>
  );
}

/**
 * A one-time password, shown once.
 *
 * Deliberately not dismissible by anything except leaving the page: this string
 * exists nowhere else, and the operator has to write it down or read it out
 * before they navigate. If it is lost, the answer is to issue another, which is
 * a two-click job — and a far better property than a system that can tell you
 * somebody's password on request.
 */
export function SecretBox({ secret }: { secret: NonNullable<State["secret"]> }) {
  const student = secret.who === "student";
  return (
    <div className="rounded border border-[#7B1E2B] bg-[#F6E9E9] p-4">
      <p className="text-xs font-semibold text-[#4A3A3C]">
        {student
          ? "Read this out to the student. It will not be shown again."
          : `Give these to ${secret.staffId}. They will not be shown again.`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-xs text-[#6B5B5D]">
          {student ? "User ID" : "Staff ID"}
          <strong className="ml-2 font-mono text-base text-[#2B1A1C]">{secret.staffId}</strong>
        </span>
        <span className="text-xs text-[#6B5B5D]">
          Password
          <strong className="ml-2 font-mono text-base tracking-wider text-[#2B1A1C]">
            {secret.password}
          </strong>
        </span>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(`${secret.staffId}  ${secret.password}`)}
          className="inline-flex items-center gap-1.5 rounded border border-[#E3D6C4] px-2.5 py-1
                     text-xs text-[#4A3A3C]"
        >
          <Copy className="h-3 w-3" aria-hidden />
          Copy both
        </button>
      </div>
      <p className="mt-3 text-xs text-[#6B5B5D]">
        {student
          ? "They sign in with these two, and the app makes them choose their own password before anything else."
          : "They must replace this password the first time they sign in."}
      </p>
    </div>
  );
}

/**
 * A one-button form for a row action — reset a password, switch an account off,
 * take a child out of a batch.
 *
 * Every one of these is a server action with its own permission check, so the
 * button is a convenience and never the security boundary.
 */
export function RowAction({
  action,
  fields,
  children,
  danger,
  primary,
  confirm,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  fields: Record<string, string>;
  children: React.ReactNode;
  danger?: boolean;
  /** The one action on a row a teacher is looking for. Filled, not outlined. */
  primary?: boolean;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <>
      <form
        action={formAction}
        onSubmit={(e) => {
          // window.confirm, not a modal: this is an office tool, and a native
          // dialog cannot be missed or mis-styled. It blocks nothing else.
          if (confirm && !window.confirm(confirm)) e.preventDefault();
        }}
        className="inline"
      >
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <RowButton danger={danger} primary={primary}>
          {children}
        </RowButton>
      </form>
      {state.secret ? (
        <div className="mt-2">
          <SecretBox secret={state.secret} />
        </div>
      ) : null}
      {state.message ? (
        <div className="mt-1">
          <Alert state={state} />
        </div>
      ) : null}
    </>
  );
}

function RowButton({
  danger,
  primary,
  children,
}: {
  danger?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded border px-2.5 py-1 text-xs disabled:opacity-50 ${
        danger
          ? "border-[#E8C9CC] text-[#B22234] hover:bg-[#FBE9EA]"
          : primary
            ? "border-transparent bg-[#7B1E2B] px-3 py-1.5 font-semibold text-[#FDFBF7]"
            : "border-[#E3D6C4] text-[#4A3A3C] hover:bg-[#F6E9E9]"
      }`}
    >
      {pending ? "…" : children}
    </button>
  );
}

/* ------------------------------------------------------------- selection --- */

/**
 * Which rows of a queue are ticked.
 *
 * Kept as ids, and read through the rows on screen: once an action lands and
 * the page refreshes, an approved row is gone from `ids` and so drops out of
 * the selection by itself. A tick can never point at a row that is not shown.
 */
export function useSelection(ids: string[]) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const shown = new Set(ids);
  const selected = [...picked].filter((id) => shown.has(id));

  return {
    selected,
    has: (id: string) => picked.has(id) && shown.has(id),
    toggle: (id: string) =>
      setPicked((p) => {
        const next = new Set(p);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    /** Tick or untick a group at once -- a school, a "matched" list, everything. */
    setMany: (group: string[], on: boolean) =>
      setPicked((p) => {
        const next = new Set(p);
        for (const id of group) {
          if (on) next.add(id);
          else next.delete(id);
        }
        return next;
      }),
    clear: () => setPicked(new Set()),
  };
}
export type Selection = ReturnType<typeof useSelection>;

/** A row's tick box. */
export function Tick({ sel, id, label }: { sel: Selection; id: string; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={sel.has(id)}
      onChange={() => sel.toggle(id)}
      className="mt-1 h-4 w-4 shrink-0 accent-[#7B1E2B]"
    />
  );
}

/** "Select all" for a group: ticked when every row in it is, half-ticked when some are. */
export function TickAll({ sel, ids, label }: { sel: Selection; ids: string[]; label: string }) {
  const on = ids.filter((id) => sel.has(id)).length;
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-[#4A3A3C]">
      <input
        type="checkbox"
        aria-label={label || "Select all in this group"}
        checked={ids.length > 0 && on === ids.length}
        ref={(el) => {
          if (el) el.indeterminate = on > 0 && on < ids.length;
        }}
        onChange={() => sel.setMany(ids, on < ids.length)}
        disabled={ids.length === 0}
        className="h-4 w-4 accent-[#7B1E2B]"
      />
      {label}
    </label>
  );
}

/**
 * The bar that appears once anything is ticked: how many, and what to do with
 * them. Sticky, because the ticking happens forty rows down from the top.
 */
export function BulkBar({
  sel,
  noun,
  children,
}: {
  sel: Selection;
  noun: [string, string];
  children: React.ReactNode;
}) {
  const count = sel.selected.length;
  if (count === 0) return null;
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-start gap-x-4 gap-y-2 rounded border border-[#7B1E2B] bg-[#F6E9E9] px-4 py-3">
      <p className="pt-1 text-xs font-semibold text-[#2B1A1C]">
        {count.toLocaleString("en-IN")} {count === 1 ? noun[0] : noun[1]} selected
      </p>
      <button
        type="button"
        onClick={sel.clear}
        className="pt-1 text-xs text-[#6B5B5D] underline-offset-2 hover:underline"
      >
        Clear
      </button>
      <div className="ml-auto flex flex-wrap items-start gap-2">{children}</div>
    </div>
  );
}

/**
 * One button that sends a list of ids to a server action, as `ids`.
 *
 * The action decides what it may do with each one -- this only carries the
 * list. `confirm` is asked first, as everywhere else in the control centre.
 */
export function BulkAction({
  action,
  ids,
  fields = {},
  confirm,
  danger,
  primary,
  children,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  ids: string[];
  fields?: Record<string, string>;
  confirm?: string;
  danger?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (confirm && !window.confirm(confirm)) e.preventDefault();
        }}
        className="inline"
      >
        <input type="hidden" name="ids" value={ids.join(",")} />
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <RowButton danger={danger} primary={primary}>
          {children}
        </RowButton>
      </form>
      {state.message ? (
        <div className="mt-1">
          <Alert state={state} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Turn down everything ticked, with one reason for all of them.
 *
 * Behind a disclosure like the single-row version, so the reason box is only
 * there when it is wanted.
 */
export function BulkReject({
  action,
  ids,
  noun,
  reader,
  defaultReason,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  ids: string[];
  noun: string;
  reader: string;
  defaultReason?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <details className="w-full sm:w-auto">
      <summary className="cursor-pointer select-none rounded border border-[#E8C9CC] bg-[#FFFFFF] px-2.5 py-1 text-xs text-[#B22234] hover:bg-[#FBE9EA]">
        Turn down {ids.length}…
      </summary>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm(`Turn down ${ids.length} ${noun}? This cannot be undone from here.`)) e.preventDefault();
        }}
        className="mt-2 w-full space-y-2 sm:w-96"
      >
        <input type="hidden" name="ids" value={ids.join(",")} />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#6B5B5D]">
            One reason for all {ids.length} · {reader} read it, word for word
          </span>
          <textarea name="reason" rows={2} maxLength={300} defaultValue={defaultReason} className={INPUT} />
        </label>
        <RowButton danger>Turn down {ids.length}</RowButton>
        <Alert state={state} />
      </form>
    </details>
  );
}
