"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const ITEMS = ["Photo ID", "Phone charged", "Black or blue pen", "I know my route"] as const;

/**
 * The exam-day checklist. Ticks live on the student's own phone.
 *
 * Deliberately not synced to the server: it is a personal note, nobody at KIDS
 * needs to see it, and it must keep working when the network does not. Storage
 * failures are swallowed -- a student in Private mode still gets a working
 * checklist for this session, and the device check is what tells them their
 * storage is broken.
 */
export default function Checklist({ uid }: { uid: string }) {
  const key = `kids:checklist:${uid}`;
  // One piece of state, so restoring the ticks is a single update rather than a
  // cascade of them.
  const [state, setState] = useState<{ loaded: boolean; ticked: string[] }>({
    loaded: false,
    ticked: [],
  });
  const { loaded, ticked } = state;

  useEffect(() => {
    let saved: string[] = [];
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) saved = JSON.parse(raw) as string[];
    } catch {
      /* no storage: the list still works, it just won't persist */
    }
    // Ticks are stored by item name, so a student who ticked an item we have
    // since removed would come back to a phone holding a tick for nothing --
    // and a counter reading "5 of 4". Only remember items that still exist.
    saved = saved.filter((item) => (ITEMS as readonly string[]).includes(item));
    // localStorage does not exist during SSR, so the ticks can only be read
    // after mount -- reading them during render would hydrate different checkbox
    // state than the server sent. Runs exactly once per student.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ loaded: true, ticked: saved });
  }, [key]);

  const toggle = (item: string) => {
    const next = ticked.includes(item) ? ticked.filter((i) => i !== item) : [...ticked, item];
    setState({ loaded: true, ticked: next });
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="portal-card p-5">
      <div className="mb-0.5 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
          Exam-day checklist
        </h2>
        <span className="text-xs font-semibold text-[var(--teal)]">
          {loaded ? `${ticked.length} of ${ITEMS.length}` : ""}
        </span>
      </div>
      <p className="mb-3 text-xs text-[var(--ink-muted)]">Ticks are saved on this phone.</p>

      <ul>
        {ITEMS.map((item) => {
          const on = ticked.includes(item);
          return (
            <li key={item}>
              <label className="flex cursor-pointer items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(item)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--maroon)] peer-focus-visible:ring-offset-2 ${
                    on
                      ? "border-[var(--maroon)] bg-[var(--maroon)]"
                      : "border-[var(--cream-muted)] bg-white"
                  }`}
                >
                  {on && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                </span>
                <span
                  className={`text-sm ${on ? "text-[var(--ink-muted)] line-through" : "text-[var(--ink)]"}`}
                >
                  {item}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
