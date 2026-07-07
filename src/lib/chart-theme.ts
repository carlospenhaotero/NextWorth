/**
 * Shared Recharts theming. Recharts needs concrete color values (it can't
 * read CSS custom properties), so the palette lives here once instead of
 * being re-typed as magic hex in every chart component.
 *
 * Keep these in sync with the tokens in globals.css.
 */
export const chartTheme = {
  accent: "#818cf8", // accent-hover — series/emphasis on dark
  positive: "#4ade80",
  negative: "#f87171",
  grid: "#262626",
  axis: "#525252",
  axisTick: "#737373",
  reference: "#737373",
  tooltip: {
    backgroundColor: "#1c1c1c",
    borderColor: "#404040",
    color: "#fafafa",
    borderRadius: "0.75rem",
  } as const,
} as const;
