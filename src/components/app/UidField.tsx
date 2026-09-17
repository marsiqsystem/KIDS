"use client";

import { useId } from "react";

/**
 * The nine-digit User ID, in one box, grouped 3 · 3 · 3 as it is typed.
 *
 * The grouping follows the brief's data shape (`XXX XXX XXX`), which is how
 * every other screen in the app now prints a UID — the reset card, the
 * register's issued number, Profile — so a child checks the same picture
 * everywhere.
 *
 * There is exactly ONE input, transparent, stretched over the box. Formatting
 * spaces into a real input fights the caret on every keystroke and breaks
 * paste and autofill; here the box is only a picture of a single value.
 */
export default function UidField({
  value,
  onChange,
  invalid,
  autoFocus,
  name = "uid",
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
  name?: string;
}) {
  const id = useId();
  const groups = [value.slice(0, 3), value.slice(3, 6), value.slice(6, 9)].filter(Boolean);

  return (
    <div className={`door-uid${invalid ? " door-uid--bad" : ""}`}>
      <div className="door-uid__face" aria-hidden="true">
        {value.length === 0 ? (
          <span className="door-uid__ghost">000 000 000</span>
        ) : (
          <span>{groups.join(" ")}</span>
        )}
        {value.length < 9 ? <span className="door-uid__caret" /> : null}
      </div>
      <input
        id={id}
        className="door-uid__input"
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="username"
        // A hint to the keyboard, not the validation — that is done on the
        // server, where a student cannot switch it off.
        pattern="[0-9]*"
        maxLength={9}
        value={value}
        autoFocus={autoFocus}
        aria-label="User ID, nine digits"
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 9))}
      />
    </div>
  );
}

export { groupUid } from "@/lib/app/uid";
