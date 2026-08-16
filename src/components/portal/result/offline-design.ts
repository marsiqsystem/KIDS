/**
 * The written paper's visual vocabulary, taken verbatim from the design.
 *
 * Every value here is copied out of `SET 2026 Result.dc.html` (the Claude
 * Design handoff) rather than eyeballed from a screenshot. They are literals on
 * purpose: the design expresses them as inline styles, and re-deriving them
 * from the token palette is how a page ends up "nearly" right.
 *
 * The design's five states are not the same as the scorer's. `flagged` is the
 * design's word for a line the machine could not read — two bubbles filled, or
 * too faint — which is exactly what our reader calls a double mark.
 */
export type SheetState = "correct" | "wrong" | "blank" | "graced" | "flagged";

export const ST: Record<SheetState, {
  bg: string; stroke: string; fg: string; glyph: string; label: string;
}> = {
  correct: { bg: "#D3EDE8", stroke: "#57B3A4", fg: "#0B5F53", glyph: "✓", label: "Correct" },
  wrong:   { bg: "#F6E2E4", stroke: "#C98D95", fg: "#7B1E2B", glyph: "✕", label: "Wrong" },
  blank:   { bg: "#F2E9DA", stroke: "#D0BC9E", fg: "#5C4D4F", glyph: "–", label: "Not answered" },
  graced:  { bg: "#F7EEDA", stroke: "#C9A24B", fg: "#8A6A17", glyph: "★", label: "Grace mark given" },
  flagged: { bg: "#FBF3E2", stroke: "#C9A24B", fg: "#8A6A17", glyph: "?", label: "Could not be read" },
};

/** The design's own wording for how to read the sheet. */
export const LEGEND: { k: SheetState; text: string }[] = [
  { k: "correct", text: "You filled the right bubble. The letter is shown solid." },
  { k: "wrong", text: "Your filled bubble is solid maroon; the right one is ringed in a dashed line." },
  { k: "blank", text: "You left every bubble on that line empty." },
  { k: "graced", text: "A grace mark. No answer was possible, so everyone was given the mark." },
  { k: "flagged", text: "The machine could not read the line — two marks, or too faint." },
];

/** One bubble on one line, exactly as the design draws it. */
export function bubbleStyle(kind: "both" | "pick" | "key" | "flag" | "grace" | "plain"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 19, height: 19, borderRadius: "50%",
    fontSize: "0.6rem", fontWeight: 700, lineHeight: 1,
  };
  switch (kind) {
    case "both":  return { ...base, background: "#0F7A69", border: "2px solid #0B5F53", color: "#FFFFFF" };
    case "pick":  return { ...base, background: "#7B1E2B", border: "2px solid #7B1E2B", color: "#FBF7EF" };
    case "key":   return { ...base, background: "#FFFFFF", border: "2px dashed #0F7A69", color: "#0B5F53" };
    case "flag":  return { ...base, border: "2px solid #8A6A17", color: "#3D2A12",
      background: "repeating-linear-gradient(45deg,#C9B79C,#C9B79C 2px,#FFFFFF 2px,#FFFFFF 4px)" };
    case "grace": return { ...base, background: "#F7EEDA", border: "2px solid var(--gold)", color: "#8A6A17" };
    default:      return { ...base, background: "transparent", border: "1.5px solid #C9B79C",
      color: "#9A8873", fontWeight: 600 };
  }
}
