"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A confirm step drawn in the page, board 17: a white card with a maroon edge,
 * a question, one line of consequence, and two buttons -- the safe one first.
 *
 * Replaces window.confirm on the question pages. A native dialog cannot say
 * "This replaces the 98 loaded now" in a way anybody reads, and it looks like
 * the browser asking rather than KIDS.
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  cancel,
  confirm,
  danger,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  cancel: string;
  confirm: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const safe = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    safe.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(43,26,28,0.32)] px-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] rounded-xl border-[1.5px] border-[#7B1E2B] bg-white px-5 py-[18px] shadow-[0_12px_32px_rgba(43,26,28,0.14)]"
      >
        <div className="text-[15px] font-bold text-[#2B1A1C]">{title}</div>
        {children ? <div className="mb-3.5 mt-2 text-[13px] leading-relaxed text-[#6B5B5D]">{children}</div> : <div className="h-3.5" />}
        <div className="flex justify-end gap-2.5">
          <button
            ref={safe}
            type="button"
            onClick={onCancel}
            className="h-9 rounded-[9px] border-[1.5px] border-[#F2E9DA] px-3.5 text-[13px] font-semibold text-[#2B1A1C] hover:bg-[#FBF7EF]"
          >
            {cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`h-9 rounded-[9px] px-3.5 text-[13px] font-semibold text-[#FDFBF7] disabled:opacity-50 ${
              danger ? "bg-[#B22234]" : "bg-[#7B1E2B]"
            }`}
          >
            {busy ? "…" : confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
