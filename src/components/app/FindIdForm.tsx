"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Search } from "lucide-react";
import FormAlert from "./FormAlert";
import DeviceField from "./DeviceField";
import { groupUid } from "./UidField";
import { findSchools } from "@/lib/app/school-search";
import { findIdAction, type FindIdState } from "@/app/app/actions";
import type { School } from "@/lib/app/registrations";

/**
 * Find my User ID (26 Nov 2026). One screen: name, date of birth, school →
 * the User ID, and the one way on (claim, sign in, or ask the office).
 * The server does the finding and the counting: src/lib/app/registrations.ts.
 */
export default function FindIdForm({ schools }: { schools: School[] }) {
  const [state, formAction, pending] = useActionState<FindIdState, FormData>(findIdAction, {});
  const [name, setName] = useState("");
  const [d, setD] = useState("");
  const [m, setM] = useState("");
  const [y, setY] = useState("");
  const [school, setSchool] = useState("");
  const [query, setQuery] = useState("");
  const month = useRef<HTMLInputElement>(null);
  const year = useRef<HTMLInputElement>(null);

  const found = useMemo(() => (query.trim() ? findSchools(schools, query) : []), [query, schools]);
  const chosen = schools.find((s) => `${s.centre_code}|${s.school_code}` === school) ?? null;
  const ready = name.trim().length >= 2 && d && m && y.length === 4 && chosen;

  if (state.found?.length) {
    return (
      <div className="door-body">
        <h2 className="door-h2">{state.found.length === 1 ? "Your User ID" : "Is it one of these?"}</h2>
        {state.found.map((f) => (
          <div key={f.uid} className="door-summary">
            <p className="k-mono" style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
              {groupUid(f.uid)}
            </p>
            <p className="door-hint">
              Class {f.class} · {f.school_name} · {f.centre_name}
            </p>
            <Link href={f.href} className="k-btn">
              {f.label}
            </Link>
          </div>
        ))}
        <p className="door-foot">Write your User ID down — you need it every time you sign in.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="door-body">
      <DeviceField />
      <input type="hidden" name="school" value={school} />
      <p className="door-hint">
        For students who sat a KIDS exam and have lost their KIDS card. Type your name as it was on your admit card.
      </p>

      <div className="door-field">
        <label className="k-label" htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          name="name"
          className={`door-input${state.field === "name" ? " door-input--bad" : ""}`}
          autoCapitalize="words"
          placeholder="Student’s own name, not the school"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="door-field">
        <label className="k-label" htmlFor="dobDay">
          Date of birth
        </label>
        <div className="door-dob">
          <label>
            <input
              id="dobDay"
              name="dobDay"
              className={`door-box${state.field === "dob" ? " door-box--bad" : ""}`}
              inputMode="numeric"
              maxLength={2}
              value={d}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setD(v);
                if (v.length === 2) month.current?.focus();
              }}
              aria-label="Day"
            />
            <span>DD</span>
          </label>
          <label>
            <input
              ref={month}
              name="dobMonth"
              className={`door-box${state.field === "dob" ? " door-box--bad" : ""}`}
              inputMode="numeric"
              maxLength={2}
              value={m}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setM(v);
                if (v.length === 2) year.current?.focus();
              }}
              aria-label="Month"
            />
            <span>MM</span>
          </label>
          <label className="door-dob__year">
            <input
              ref={year}
              name="dobYear"
              className={`door-box${state.field === "dob" ? " door-box--bad" : ""}`}
              inputMode="numeric"
              maxLength={4}
              value={y}
              onChange={(e) => setY(e.target.value.replace(/\D/g, ""))}
              aria-label="Year"
            />
            <span>YYYY</span>
          </label>
        </div>
      </div>

      <div className="door-field">
        <span className="k-label">School</span>
        <label className="door-search">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            placeholder="Type your school’s name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Find your school"
          />
        </label>
        {chosen ? (
          <div className="door-chosen">
            <Check size={18} aria-hidden="true" />
            <span>
              <b>{chosen.school_name}</b>
              <span>{chosen.centre_name}</span>
            </span>
          </div>
        ) : null}
        <div className="door-schools">
          {found.map((s) => {
            const key = `${s.centre_code}|${s.school_code}`;
            return (
              <button
                key={key}
                type="button"
                className={`door-school${school === key ? " door-school--on" : ""}`}
                onClick={() => setSchool(key)}
                aria-pressed={school === key}
              >
                {s.school_name} <span className="door-hint">· {s.centre_name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <FormAlert state={{ message: state.message }} />
      {state.message && state.field === "name" ? (
        <p className="door-foot">
          Never sat a KIDS exam? <Link href="/app/register">Register as new</Link>
        </p>
      ) : null}

      <div className="door-bottom">
        <button type="submit" className="k-btn" disabled={!ready || pending}>
          {pending ? "Finding…" : "Find my User ID"}
        </button>
      </div>
    </form>
  );
}
