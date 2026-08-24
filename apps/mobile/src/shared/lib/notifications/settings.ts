import {
  DEFAULT_REMINDER_SETTINGS,
  type ReminderSettings,
  readInt,
  readLeadDays,
} from "@subeye/reminders";
import { deviceFlags, deviceJson } from "@/shared/lib/mmkv";

/**
 * Where reminder configuration is stored.
 *
 * PER-DEVICE, not per-account: two phones configure independently and a
 * reinstall forgets. That is the price of a notification system with no server,
 * no push token and no DB row, and it is the right trade — a reminder fires on a
 * device, and which device buzzes at 09:00 is legitimately a device question.
 *
 * The shape and its sanitisers live in `@subeye/reminders`; only the storage
 * does not, because a pure package cannot reach MMKV.
 */

const SETTINGS_KEY = "notifications.settings";

/**
 * What v1 stored: a single boolean, when there was one reminder and no config.
 * Read once on upgrade so an install that already had reminders on keeps them —
 * migrating by going silent is the one outcome nobody would report as a bug.
 */
const LEGACY_ENABLED_KEY = "notifications.renewalReminders";

/** The stored configuration, sanitised. Never throws, never returns garbage. */
export function readNotificationSettings(): ReminderSettings {
  const raw = deviceJson.get<Partial<ReminderSettings> | null>(
    SETTINGS_KEY,
    null,
  );

  if (!raw) {
    return {
      ...DEFAULT_REMINDER_SETTINGS,
      renewals: deviceFlags.get(LEGACY_ENABLED_KEY),
    };
  }

  return {
    renewals: raw.renewals === true,
    trials: raw.trials === true,
    renewalLeadDays: readLeadDays(
      raw.renewalLeadDays,
      DEFAULT_REMINDER_SETTINGS.renewalLeadDays,
    ),
    trialLeadDays: readLeadDays(
      raw.trialLeadDays,
      DEFAULT_REMINDER_SETTINGS.trialLeadDays,
    ),
    hour: readInt(raw.hour, 0, 23, DEFAULT_REMINDER_SETTINGS.hour),
    minute: readInt(raw.minute, 0, 59, DEFAULT_REMINDER_SETTINGS.minute),
  };
}

/** Merge a patch over the stored settings and return what actually stuck. */
export function writeNotificationSettings(
  patch: Partial<ReminderSettings>,
): ReminderSettings {
  const next = { ...readNotificationSettings(), ...patch };
  deviceJson.set(SETTINGS_KEY, next);
  return next;
}
