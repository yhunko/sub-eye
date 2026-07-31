import { deviceFlags, deviceJson } from "@/shared/lib/mmkv";

/**
 * Reminder configuration — device-local, like the schedule it drives.
 *
 * PER-DEVICE, not per-account: two phones configure independently and a
 * reinstall forgets. That is the price of a notification system with no server,
 * no push token and no DB row, and it is the right trade — a reminder fires on a
 * device, and which device buzzes at 09:00 is legitimately a device question.
 */

/**
 * Days before an event a reminder may fire; `0` is the morning of.
 *
 * Deliberately a short fixed list rather than a free number. Every value costs a
 * Ukrainian spelling of "in N days" (Hermes has no `Intl.PluralRules`, so
 * plurals are spelled per locale in the catalog), and a picker offering 0–30
 * would be four screens of choice for a decision nobody wants to make twice.
 */
export const LEAD_DAY_CHOICES = [0, 1, 3, 7] as const;

export type NotificationSettings = {
  renewals: boolean;
  renewalLeadDays: number[];
  trials: boolean;
  trialLeadDays: number[];
  /** Wall-clock, in the DEVICE's zone — see `fireInstant` in ./plan. */
  hour: number;
  minute: number;
};

const SETTINGS_KEY = "notifications.settings";

/**
 * What v1 stored: a single boolean, when there was one reminder and no config.
 * Read once on upgrade so an install that already had reminders on keeps them —
 * migrating by going silent is the one outcome nobody would report as a bug.
 */
const LEGACY_ENABLED_KEY = "notifications.renewalReminders";

/** The one lead time a free install gets, and the free default. */
export const FREE_LEAD_DAYS = [1];

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  renewals: false,
  renewalLeadDays: [1],
  trials: false,
  trialLeadDays: [1, 3],
  hour: 9,
  minute: 0,
};

const readInt = (
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

const readLeadDays = (value: unknown, fallback: number[]): number[] => {
  if (!Array.isArray(value)) return fallback;

  const choices: readonly number[] = LEAD_DAY_CHOICES;
  const kept = [...new Set(value)]
    .filter((day): day is number => choices.includes(day as number))
    .sort((a, b) => a - b);

  // An empty set would leave the switch reading "on" while nothing is ever
  // scheduled. Deselecting the last lead time falls back instead of going quiet.
  return kept.length ? kept : fallback;
};

/** The stored configuration, sanitised. Never throws, never returns garbage. */
export function readNotificationSettings(): NotificationSettings {
  const raw = deviceJson.get<Partial<NotificationSettings> | null>(
    SETTINGS_KEY,
    null,
  );

  if (!raw) {
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      renewals: deviceFlags.get(LEGACY_ENABLED_KEY),
    };
  }

  return {
    renewals: raw.renewals === true,
    trials: raw.trials === true,
    renewalLeadDays: readLeadDays(
      raw.renewalLeadDays,
      DEFAULT_NOTIFICATION_SETTINGS.renewalLeadDays,
    ),
    trialLeadDays: readLeadDays(
      raw.trialLeadDays,
      DEFAULT_NOTIFICATION_SETTINGS.trialLeadDays,
    ),
    hour: readInt(raw.hour, 0, 23, DEFAULT_NOTIFICATION_SETTINGS.hour),
    minute: readInt(raw.minute, 0, 59, DEFAULT_NOTIFICATION_SETTINGS.minute),
  };
}

/** Merge a patch over the stored settings and return what actually stuck. */
export function writeNotificationSettings(
  patch: Partial<NotificationSettings>,
): NotificationSettings {
  const next = { ...readNotificationSettings(), ...patch };
  deviceJson.set(SETTINGS_KEY, next);
  return next;
}

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
  stored: NotificationSettings,
  isPro: boolean,
): NotificationSettings {
  if (isPro) return stored;

  return {
    ...stored,
    renewalLeadDays: FREE_LEAD_DAYS,
    trials: false,
    trialLeadDays: FREE_LEAD_DAYS,
  };
}
