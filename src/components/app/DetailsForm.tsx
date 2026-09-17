"use client";

import { useActionState, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { requestCorrectionsAction, type CorrectionState } from "@/app/app/actions";
import type { School } from "@/lib/app/registrations";
import FormAlert from "./FormAlert";

/**
 * Ask to change a detail. Redesign board 07, 3B.
 *
 * Choose what is wrong, see what the record says, type or pick what it should
 * say. One field per request — the office accepts a spelling and still queries
 * a class change. Nothing on the register changes until the office approves.
 *
 * The form still carries every field, pre-filled from the register, and the
 * server files only the ones that differ: the picker just decides which one the
 * child is looking at. Stream is a choice here too — the board dropped it, the
 * brief lists it.
 */

type Field = "name" | "dob" | "class" | "stream" | "school";

const REASONS: { id: Field; label: string }[] = [
  { id: "name", label: "My name is spelt wrong" },
  { id: "dob", label: "My date of birth is wrong" },
  { id: "class", label: "I am in a different class" },
  { id: "stream", label: "My stream is wrong" },
  { id: "school", label: "I changed school" },
];

export default function DetailsForm({
  current,
  schools,
}: {
  current: {
    name: string;
    dob: string | null;
    class: string;
    stream: string | null;
    centre_code: string;
    school_code: string;
  };
  schools: School[];
}) {
  const [state, action, pending] = useActionState<CorrectionState, FormData>(requestCorrectionsAction, {});
  const [field, setField] = useState<Field | null>(null);
  const [name, setName] = useState(current.name);
  const [dob, setDob] = useState(() => {
    const [d, m, y] = (current.dob ?? "").split("-");
    return { d: d ?? "", m: m ?? "", y: y ?? "" };
  });
  const [cls, setCls] = useState(current.class);
  const [stream, setStream] = useState(current.stream ?? "");
  const [school, setSchool] = useState(`${current.centre_code}|${current.school_code}`);
  const [query, setQuery] = useState("");

  const currentSchool = schools.find((s) => `${s.centre_code}|${s.school_code}` === `${current.centre_code}|${current.school_code}`);
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q.length < 2 ? [] : schools.filter((s) => s.school_name.toLowerCase().includes(q)).slice(0, 20);
  }, [query, schools]);

  const reasons = REASONS.filter((r) => r.id !== "stream" || cls === "XI" || cls === "XII");

  if (state.ok) {
    return (
      <div className="door-notice" role="status">
        <div className="door-notice__text">
          <p className="k-h">Sent to the KIDS office</p>
          <p className="k-line">You will see a notice here either way.</p>
        </div>
      </div>
    );
  }

  const onFile: Record<Field, string> = {
    name: current.name,
    dob: current.dob ? current.dob.split("-").join(" / ") : "Not on file",
    class: current.class,
    stream: current.stream ?? "Not on file",
    school: currentSchool?.school_name ?? "",
  };

  return (
    <form action={action} className="dt">
      {/* Every field travels; only the changed ones are filed. */}
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="dobDay" value={dob.d} />
      <input type="hidden" name="dobMonth" value={dob.m} />
      <input type="hidden" name="dobYear" value={dob.y} />
      <input type="hidden" name="class" value={cls} />
      <input type="hidden" name="stream" value={stream} />
      <input type="hidden" name="school" value={school} />

      <div className="dt-reasons" role="radiogroup" aria-label="What is wrong">
        {reasons.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={field === r.id}
            className={`k-row dt-reason${field === r.id ? " dt-reason--on" : ""}`}
            onClick={() => setField(r.id)}
          >
            <span className="dt-reason__radio" aria-hidden="true" />
            <span className="k-row__title">{r.label}</span>
          </button>
        ))}
      </div>

      {field ? (
        <div className="k-card dt-change">
          <div className="k-label">How it should read</div>
          <div className="dt-was">{onFile[field]}</div>

          {field === "name" ? (
            <input
              className="door-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoCapitalize="words"
              aria-label="Your name as it should read"
            />
          ) : null}

          {field === "dob" ? (
            <div className="door-dob">
              {(["d", "m", "y"] as const).map((k) => (
                <label key={k} className={k === "y" ? "door-dob__year" : undefined}>
                  <input
                    className="door-box"
                    inputMode="numeric"
                    maxLength={k === "y" ? 4 : 2}
                    value={dob[k]}
                    onChange={(e) => setDob((x) => ({ ...x, [k]: e.target.value.replace(/\D/g, "") }))}
                    aria-label={k === "d" ? "Day" : k === "m" ? "Month" : "Year"}
                  />
                  <span>{k === "d" ? "DD" : k === "m" ? "MM" : "YYYY"}</span>
                </label>
              ))}
            </div>
          ) : null}

          {field === "class" ? (
            <div className="door-seg">
              {["IX", "X", "XI", "XII"].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`door-seg__opt${cls === c ? " door-seg__opt--on" : ""}`}
                  onClick={() => setCls(c)}
                  aria-pressed={cls === c}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : null}

          {field === "stream" ? (
            <div className="door-seg">
              {["Science", "Commerce", "Arts"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`door-seg__opt${stream === s ? " door-seg__opt--on" : ""}`}
                  onClick={() => setStream(s)}
                  aria-pressed={stream === s}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          {field === "school" ? (
            <>
              <label className="door-search">
                <Search size={20} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Type your new school’s name"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Find your new school"
                />
              </label>
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
                    {s.school_name}
                    <span className="door-hint"> · {s.centre_name}</span>
                  </button>
                );
              })}
              <p className="door-hint">Your User ID stays the same.</p>
            </>
          ) : null}

          <label className="door-field">
            <span className="k-label">Note · optional</span>
            <textarea name="note" className="door-input dt-note" rows={2} maxLength={300} />
          </label>
        </div>
      ) : null}

      <FormAlert state={{ message: state.message }} />

      <button type="submit" className="k-btn" disabled={pending || !field}>
        {pending ? "Sending…" : "Send to the office"}
      </button>
    </form>
  );
}
