import type { SubscriptionStatus } from "@subeye/shared";

// The single design-token source. Dark-only — there is no light theme, and
// app.json pins userInterfaceStyle: "dark" so the OS never fights us.
export const colors = {
  bg: "#0f1115",
  surface: "#171a20",
  surfaceAlt: "#1f232b",
  text: "#f2f4f8",
  muted: "#98a0ae",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.16)",
  // Green is BRAND + interaction, never "money is good" — every amount in a
  // spend tracker is money leaving, so amounts stay neutral.
  accent: "#33a453",
  accentSoft: "rgba(51,164,83,0.14)",
  // Focus/active affordances only. #33a453 on #0f1115 is 5.92:1 — fine for a
  // filled button, too dim for a 1px focused border, which is what this is for.
  accentBright: "#6fd98c",
  accentPressed: "#2b8a46",
  accentDisabled: "#1f6634",
  danger: "#f87171",
  dangerSoft: "rgba(248,113,113,0.14)",
  dangerBorder: "rgba(248,113,113,0.32)",
  // Amber. Only ever "this is suspended", never "this is wrong" — it is the
  // paused hue, shared by the paused row tint and the Pause swipe action.
  warning: "#e0a32e",
  warningSoft: "rgba(224,163,46,0.10)",
} as const;

// One colour per category row on Home, assigned by rank — categorySpending
// arrives sorted by amount desc, so the biggest slice keeps the same hue between
// renders. Ranks past the end reuse the ramp; a tail category is a sliver anyway.
export const categoryColors = [
  "#e8834e",
  "#34c759",
  "#c15cff",
  "#d4d640",
  "#4a9eff",
  "#f0507e",
  "#43d17a",
] as const;

// Lifecycle status reads from the row's own fill instead of a badge, so the name
// keeps the full row width and a list scans as colour rather than chrome.
//
// OPAQUE values, deliberately not alpha over `surface`: a subscription row slides
// sideways over its swipe actions, and a translucent fill would let the Pause and
// Cancel buttons bleed through it mid-drag.
export const statusTint: Record<
  SubscriptionStatus,
  { bg: string; border: string }
> = {
  active: { bg: colors.surface, border: colors.border },
  paused: { bg: "#3c3421", border: "rgba(251,191,36,0.34)" },
  cancelling: { bg: "#3b2d25", border: "rgba(249,146,60,0.36)" },
  cancelled: { bg: "#272a31", border: "rgba(152,160,174,0.22)" },
};

// Cap Dynamic Type growth on layout-critical text (the fixed-size hero numbers
// on Home, compact chips) so extreme OS font sizes cannot shatter the layout.
// Body/prose text stays uncapped — it should scale fully for accessibility.
export const LAYOUT_FONT_SCALE_MAX = 1.3;
