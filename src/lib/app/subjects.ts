/**
 * One colour per subject — the redesign's first addition to the design system.
 *
 * Used as a spine, a ring, a chip: never as a page background. IX/X take the
 * seven hues Design drew; XI/XII stream subjects reuse the hue of their IX/X
 * namesake, and the ones with no namesake take a hue nothing else in their own
 * stream uses, so the three a student chooses never collide.
 *
 * Every hue carries 14px white text at AA.
 */

const HUES: Record<string, string> = {
  English: "#7B1E2B",
  "General Knowledge": "#B07A1F",
  History: "#8C5A2B",
  Geography: "#1E9E8C",
  "Life Science": "#4A7C2F",
  "Physical Science": "#1E4DA1",
  Mathematics: "#5B3A8C",
  "English & General Knowledge": "#7B1E2B",

  // Science
  Physics: "#1E4DA1",
  Chemistry: "#1E9E8C",
  Biology: "#4A7C2F",
  // Commerce
  Accountancy: "#5B3A8C",
  "Business Studies": "#1E4DA1",
  "Cost & Taxation": "#8C5A2B",
  Economics: "#B07A1F",
  // Arts
  Education: "#1E4DA1",
  "Environmental Science": "#4A7C2F",
  Philosophy: "#5B3A8C",
  "Political Science": "#9A3340",
};

export function subjectHue(section: string): string {
  return HUES[section] ?? "#6B5B5D";
}

/** The short form for a chip in the Home header, where four must fit on a line. */
const SHORT: Record<string, string> = {
  "General Knowledge": "Gen. Know.",
  "Life Science": "Life Sci.",
  "Physical Science": "Phys. Sci.",
  Mathematics: "Maths",
  "English & General Knowledge": "Eng. & GK",
  "Business Studies": "Bus. Studies",
  "Cost & Taxation": "Cost & Tax",
  "Environmental Science": "Env. Sci.",
  "Political Science": "Pol. Sci.",
};

export function subjectShort(section: string): string {
  return SHORT[section] ?? section;
}

/** Up to two capitals for a subject tile's badge: "Life Science" → "LS". */
export function subjectInitials(section: string): string {
  if (section === "General Knowledge") return "GK";
  const words = section.split(/[\s&]+/).filter(Boolean);
  return words.length === 1 ? words[0]![0]! : words.slice(0, 2).map((w) => w[0]).join("");
}
