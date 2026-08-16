"use client";

/**
 * The one interactive thing on the marksheet.
 *
 * Deliberately NOT an automatic `window.print()` on load: a print dialog that
 * opens by itself before the page has painted is disorienting on a phone, and
 * on a slow connection it fires over a half-drawn sheet. The student presses it
 * when they can see their marks.
 */
export function PrintButton() {
  return (
    <button type="button" className="printbtn" onClick={() => window.print()}>
      Download / Print
    </button>
  );
}
