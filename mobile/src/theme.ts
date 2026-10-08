/**
 * The KIDS design system, as React Native values.
 *
 * Copied from Claude Design's tokens (colors.css, typography.css) — the same
 * ones the website's app uses through src/app/app/kit.css — so a screen drawn
 * on a board reads the same here as it does on the web.
 */
export const color = {
  maroon: "#7B1E2B",
  maroonDeep: "#3D0A10",
  maroonLight: "#9A3340",
  maroonTint: "#E8C9CC",
  maroonWash: "#F6ECEC",
  gold: "#C9A24B",
  goldLight: "#E5BE7A",
  teal: "#1E9E8C",
  cream: "#FDFBF7",
  creamSurface: "#FBF7EF",
  creamMuted: "#F2E9DA",
  ink: "#2B1A1C",
  inkMuted: "#6B5B5D",
  inkFaint: "#A3979A",
  white: "#FFFFFF",
  danger: "#B22234",
} as const;

/** Loaded in the root layout; the names are the ones @expo-google-fonts exports. */
export const font = {
  display: "PlayfairDisplay_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemibold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
} as const;

export const radius = { sm: 8, md: 10, lg: 14, xl: 16 } as const;
