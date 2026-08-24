/**
 * Days before an event a reminder may fire; `0` is the morning of.
 *
 * Deliberately a short fixed list rather than a free number. Every value costs a
 * Ukrainian spelling of "in N days" (Hermes has no `Intl.PluralRules`, so
 * plurals are spelled per locale in the catalog), and a picker offering 0–30
 * would be four screens of choice for a decision nobody wants to make twice.
 */
export const LEAD_DAY_CHOICES = [0, 1, 3, 7] as const;

export type ReminderSettings = {
  renewals: boolean;
  renewalLeadDays: number[];
  trials: boolean;
  trialLeadDays: number[];
  /** Wall-clock, in the DEVICE's zone — see `fireInstant` in ./planReminders. */
  hour: number;
  minute: number;
};

/** The one lead time a free install gets, and the free default. */
export const FREE_LEAD_DAYS = [1];

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  renewals: false,
  renewalLeadDays: [1],
  trials: false,
  trialLeadDays: [1, 3],
  hour: 9,
  minute: 0,
};

/**
 * The sanitisers below are exported because the storage half of this lives in
 * the app — a package cannot reach device storage. They are what stop a blob
 * written by an older build from becoming a crash loop, and they run at render
 * and before every schedule.
 */
export const readInt = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max
    ? value
    : fallback;

export const readLeadDays = (value: unknown, fallback: number[]): number[] => {
  if (!Array.isArray(value)) return fallback;

  const choices: readonly number[] = LEAD_DAY_CHOICES;
  const kept = [...new Set(value)]
    .filter((day): day is number => choices.includes(day as number))
    .sort((a, b) => a - b);

  // An empty set would leave the switch reading "on" while nothing is ever
  // scheduled. Deselecting the last lead time falls back instead of going quiet.
  return kept.length ? kept : fallback;
};

/** Toggle one lead time on or off, keeping the list sorted and non-empty. */
export function toggleLeadDay(current: number[], day: number): number[] {
  const next = current.includes(day)
    ? current.filter((value) => value !== day)
    : [...current, day].sort((a, b) => a - b);

  // Same reason as `readLeadDays`: an empty list is a switch that lies.
  return next.length ? next : current;
}

/**
 * What the scheduler may actually use.
 *
 * Free keeps the reminder itself and the time of day — a warning you cannot
 * receive when you are awake is not a free feature, it is a broken one. What
 * Pro buys is *more* of them: extra lead times, and trial-ending reminders.
 *
 * The stored config is never rewritten, so a purchase restores the user's real
 * choices intact. Both the screen and the app-layer sync call this: a gate
 * enforced only in the UI is a gate the scheduler ignores.
 */
export function effectiveSettings(
  stored: ReminderSettings,
  isPro: boolean,
): ReminderSettings {
  if (isPro) return stored;

  return {
    ...stored,
    renewalLeadDays: FREE_LEAD_DAYS,
    trials: false,
    trialLeadDays: FREE_LEAD_DAYS,
  };
}
