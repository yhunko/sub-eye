// The single design-token source. Dark-only — there is no light theme, and
// app.json pins userInterfaceStyle: "dark" so the OS never fights us.
export const colors = {
  bg: "#0f1115",
  surface: "#171a20",
  surfaceAlt: "#1f232b",
  text: "#f2f4f8",
  muted: "#98a0ae",
  border: "rgba(255,255,255,0.10)",
  accent: "#7dd3fc",
  danger: "#f87171",
} as const;

// Cap Dynamic Type growth on layout-critical text (the fixed-size hero numbers
// on Home, compact chips) so extreme OS font sizes cannot shatter the layout.
// Body/prose text stays uncapped — it should scale fully for accessibility.
export const LAYOUT_FONT_SCALE_MAX = 1.3;
