"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A bottom sheet: the one place a long line is allowed to live.
 *
 * The default screen stays short; "Why?", dates, and anything over the word
 * budget rise from the bottom when asked for. Closes on the backdrop, on
 * Escape, and on Android back isn't wired — the sheet is not a page.
 */
export default function Sheet({
  trigger,
  triggerClass = "k-btn k-btn--quiet",
  title,
  children,
  open: controlled,
  onClose,
}: {
  trigger?: ReactNode;
  triggerClass?: string;
  title?: string;
  children: ReactNode;
  open?: boolean;
  onClose?: () => void;
}) {
  const [own, setOwn] = useState(false);
  const open = controlled ?? own;
  const close = () => (onClose ? onClose() : setOwn(false));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (onClose ? onClose() : setOwn(false));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {trigger !== undefined ? (
        <button type="button" className={triggerClass} onClick={() => setOwn(true)} aria-haspopup="dialog">
          {trigger}
        </button>
      ) : null}
      {open ? (
        <div className="k-sheet" onClick={close}>
          <div
            className="k-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="k-sheet__grip" aria-hidden="true" />
            {title ? <h2 className="k-sheet__title">{title}</h2> : null}
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
