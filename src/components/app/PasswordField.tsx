"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password box with a show toggle.
 *
 * The toggle is not a convenience here. The cohort types on borrowed handsets
 * with small keyboards, often in a second script, and a password typed blind
 * three times is an account resting for fifteen minutes. Being able to look at
 * what you typed is the difference between getting in and going to the office.
 */
export default function PasswordField({
  name = "password",
  autoComplete = "current-password",
  invalid,
  placeholder = "Your password",
  id,
}: {
  name?: string;
  autoComplete?: "current-password" | "new-password";
  invalid?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className={`door-pass${invalid ? " door-pass--bad" : ""}`}>
      <input
        id={id}
        className="door-pass__input"
        name={name}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className="door-pass__eye"
        onClick={() => setShown((was) => !was)}
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
      >
        {shown ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
      </button>
    </div>
  );
}
