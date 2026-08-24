/**
 * The date formats a user may pick for display. This array is the single source
 * of truth: `UpdateUserPreferencesSchema` builds its picklist from it, so the
 * accepted API values and this type can never drift apart.
 */
export const dateFormats = [
  "DD.MM.YYYY",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
] as const;

export type DateFormatType = (typeof dateFormats)[number];

export const DEFAULT_DATE_FORMAT: DateFormatType = "DD/MM/YYYY";
