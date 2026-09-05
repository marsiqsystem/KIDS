"use client";

import { useState } from "react";

/**
 * A password box with a Show toggle.
 *
 * The toggle is not a convenience here. The cohort types on borrowed handsets
 * with small keyboards, often in a second script, and a password typed blind
 * three times is an account locked for fifteen minutes. Being able to look at
 * what you typed is the difference between getting in and going to a teacher.
 */
export default function PasswordField({
  name = "password",
  autoComplete = "current-password",
  invalid,
  placeholder,
}: {
  name?: string;
  autoComplete?: "current-password" | "new-password";
  invalid?: boolean;
  placeholder?: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className={`app-password${invalid ? " app-password--bad" : ""}`}>
      <input
        className="app-password__input"
        name={name}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        // The design's tracking makes eight dots legible as eight dots. It has
        // to come off when the text is shown, or a real password reads spaced out.
        style={shown ? { letterSpacing: "normal" } : undefined}
      />
      <button
        type="button"
        className="app-password__reveal"
        onClick={() => setShown((was) => !was)}
        aria-pressed={shown}
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
