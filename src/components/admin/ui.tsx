"use client";

import { useActionState } from "react";
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

export const SURFACE = "border border-[#2a2321] bg-[#1a1514]";
export const INPUT =
  "w-full rounded border border-[#3a2f2c] bg-[#141010] px-3 py-2 text-sm text-[#e8e0dc] " +
  "outline-none placeholder:text-[#6b5c57] focus:border-[#8a6f66]";

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
      <span className="mb-1 block text-xs font-semibold text-[#9c8c86]">{label}</span>
      <input
        className={INPUT}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
      />
      {hint ? <span className="mt-1 block text-xs text-[#6b5c57]">{hint}</span> : null}
    </label>
  );
}

export function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded bg-[#8a6f66] px-4 py-2 text-sm font-semibold
                 text-[#141010] disabled:opacity-50"
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
      className={`flex items-start gap-2 text-sm ${good ? "text-[#8fbfae]" : "text-[#d98b8b]"}`}
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
    <div className="rounded border border-[#8a6f66] bg-[#241c1a] p-4">
      <p className="text-xs font-semibold text-[#c9b8b2]">
        {student
          ? "Read this out to the student. It will not be shown again."
          : `Give these to ${secret.staffId}. They will not be shown again.`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-xs text-[#9c8c86]">
          {student ? "User ID" : "Staff ID"}
          <strong className="ml-2 font-mono text-base text-[#e8e0dc]">{secret.staffId}</strong>
        </span>
        <span className="text-xs text-[#9c8c86]">
          Password
          <strong className="ml-2 font-mono text-base tracking-wider text-[#e8e0dc]">
            {secret.password}
          </strong>
        </span>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(`${secret.staffId}  ${secret.password}`)}
          className="inline-flex items-center gap-1.5 rounded border border-[#3a2f2c] px-2.5 py-1
                     text-xs text-[#c9b8b2]"
        >
          <Copy className="h-3 w-3" aria-hidden />
          Copy both
        </button>
      </div>
      <p className="mt-3 text-xs text-[#6b5c57]">
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
          ? "border-[#6b3f3f] text-[#d98b8b] hover:bg-[#2a1c1c]"
          : primary
            ? "border-transparent bg-[#8a6f66] px-3 py-1.5 font-semibold text-[#141010]"
            : "border-[#3a2f2c] text-[#c9b8b2] hover:bg-[#241c1a]"
      }`}
    >
      {pending ? "…" : children}
    </button>
  );
}
