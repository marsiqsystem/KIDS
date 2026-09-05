"use client";

import { useId, useRef } from "react";

/**
 * The nine-digit User ID, drawn as nine boxes grouped 1 · 2 · 2 · 4.
 *
 * That grouping is how the number is printed and how it is built — District,
 * Centre, School, then the four digits that are the student's own — so a child
 * checking it against an admit card checks it a piece at a time rather than
 * reading nine digits in a row.
 *
 * There is exactly ONE input, transparent, stretched over all nine boxes. Nine
 * separate inputs is the obvious implementation and the wrong one: it breaks
 * paste, breaks the phone's autofill, and turns a mis-tap into a fight with
 * focus. Here the boxes are only ever a picture of a single value.
 */

const GROUPS = [1, 2, 2, 4];

export default function UidField({
  value,
  onChange,
  invalid,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  const digits = value.padEnd(9, " ").slice(0, 9).split("");
  let index = 0;

  return (
    <div className={`app-uid${invalid ? " app-uid--bad" : ""}`}>
      <div className="app-uid__boxes" aria-hidden="true">
        {GROUPS.map((size, group) => (
          <div key={group} style={{ display: "contents" }}>
            {group > 0 && <span className="app-uid__sep">·</span>}
            {Array.from({ length: size }, () => {
              const at = index++;
              const filled = digits[at].trim() !== "";
              return (
                <span
                  key={at}
                  className={`app-uid__box${at === value.length && value.length < 9 ? " app-uid__box--live" : ""}`}
                >
                  {filled ? digits[at] : ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        id={labelId}
        className="app-uid__input"
        name="uid"
        type="text"
        inputMode="numeric"
        autoComplete="username"
        // The pattern is a hint to the keyboard, not the validation — that is
        // done on the server, where a student cannot switch it off.
        pattern="[0-9]*"
        maxLength={9}
        value={value}
        autoFocus={autoFocus}
        aria-label="User ID, nine digits from your admit card"
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 9))}
      />
    </div>
  );
}
