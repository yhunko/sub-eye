/**
 * When a pending notification will fire, read back out of the OS.
 *
 * Pure and platform-agnostic, because the shape is neither. A DATE trigger is
 * NOT stored as a date on iOS: `scheduleNotificationAsync` turns it into a
 * `UNCalendarNotificationTrigger`, which serialises back as
 * `{ type: "calendar", dateComponents: { year, month, day, hour, minute } }`
 * with no timestamp anywhere on it
 * (`expo-notifications/ios/.../NotificationRecords.swift`). Reading `.value` or
 * `.date` — the fields the TypeScript input types advertise — yields `undefined`
 * on every iOS notification, which is silent: the count is still right, so the
 * status section reports "nothing scheduled" while reminders are pending and
 * firing normally.
 *
 * A REPEATING trigger is the same trap one level deeper. It becomes a
 * `UNCalendarNotificationTrigger` too, but carrying only the components it does
 * NOT recur over: no `year` at all — that is what makes it repeat — and no
 * `month` either for a MONTHLY one. Android is worse still: it keeps those
 * components at the TOP level rather than under `dateComponents`, and reports
 * `month` in the 0-based range the JS input used instead of the 1-based one iOS
 * serialises. Both are handled below; neither carries a timestamp to read.
 */

type Components = {
  year?: unknown;
  month?: unknown;
  day?: unknown;
  weekday?: unknown;
  hour?: unknown;
  minute?: unknown;
  second?: unknown;
};

/** A recurrence with every component normalised to `Date`'s own ranges. */
type Recurrence = {
  /** 0-based, like `Date.getMonth()`. */
  month: number | null;
  day: number | null;
  /** 0–6 from Sunday, like `Date.getDay()` — not the 1–7 both platforms report. */
  weekday: number | null;
  hour: number;
  minute: number;
  second: number;
};

const int = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const opt = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const weekdayIndex = (value: unknown): number | null => {
  const weekday = opt(value);
  // iOS `DateComponents.weekday` and Android `Calendar.DAY_OF_WEEK` are both
  // 1–7 from Sunday; `Date.getDay()` is 0–6 from Sunday.
  return weekday === null ? null : weekday - 1;
};

/**
 * Far enough for a 29 February rule, which skips every non-leap year and every
 * non-leap century — up to eight years between firings.
 */
const SCAN_DAYS = 8 * 366;

/**
 * The next instant matching a recurrence, in the DEVICE's zone — the zone the OS
 * matches these components in, and the one the planner built them from.
 *
 * Walks day by day rather than doing arithmetic, because the gaps are not
 * uniform: a MONTHLY rule on day 31 skips every month that has no 31st, and a
 * yearly 29 February skips three years in four.
 */
function nextMatch(parts: Recurrence, now: number): number | null {
  const cursor = new Date(now);
  cursor.setHours(parts.hour, parts.minute, parts.second, 0);

  for (let step = 0; step < SCAN_DAYS; step++) {
    if (
      cursor.getTime() >= now &&
      (parts.month === null || cursor.getMonth() === parts.month) &&
      (parts.day === null || cursor.getDate() === parts.day) &&
      (parts.weekday === null || cursor.getDay() === parts.weekday)
    ) {
      return cursor.getTime();
    }

    cursor.setDate(cursor.getDate() + 1);
    // Re-applied every step: a DST boundary shifts the wall clock underneath a
    // cursor that only ever had its date advanced.
    cursor.setHours(parts.hour, parts.minute, parts.second, 0);
  }
  return null;
}

type Trigger = Components & {
  type?: unknown;
  dateComponents?: Components;
  seconds?: unknown;
  value?: unknown;
  date?: unknown;
};

/** Android's four repeating shapes, which carry no `dateComponents` at all. */
const isAndroidRecurrence = (raw: Trigger): boolean =>
  raw.type === "daily" ||
  raw.type === "weekly" ||
  raw.type === "monthly" ||
  raw.type === "yearly";

/**
 * The iOS pattern, or `null` if these components describe one absolute instant
 * or nothing usable. No year is what marks a recurrence; an `hour` is what
 * separates one from a fragment too partial to build anything out of.
 */
function iosRecurrence(parts: Components): Recurrence | null {
  if (typeof parts.year === "number" || typeof parts.hour !== "number") {
    return null;
  }

  const month = opt(parts.month);
  return {
    // `DateComponents.month` is 1-based; `Date`'s is 0-based.
    month: month === null ? null : month - 1,
    day: opt(parts.day),
    weekday: weekdayIndex(parts.weekday),
    hour: int(parts.hour),
    minute: int(parts.minute),
    second: int(parts.second),
  };
}

/**
 * Whether the OS will re-fire this pending trigger on its own, forever.
 *
 * What the status section needs to stop reading a count as a countdown: a
 * repeating trigger is one slot that never runs out, not one reminder.
 */
export function repeatsForever(trigger: unknown): boolean {
  if (!trigger || typeof trigger !== "object") return false;

  const raw = trigger as Trigger;
  if (isAndroidRecurrence(raw)) return true;
  return (
    raw.dateComponents !== undefined &&
    iosRecurrence(raw.dateComponents) !== null
  );
}

export function triggerTime(trigger: unknown, now: number): number | null {
  if (!trigger || typeof trigger !== "object") return null;

  const raw = trigger as Trigger;

  const parts = raw.dateComponents;
  if (parts) {
    if (
      typeof parts.year === "number" &&
      typeof parts.month === "number" &&
      typeof parts.day === "number"
    ) {
      // `DateComponents.month` is 1-based; `Date`'s is 0-based. Built in the
      // device zone, which is the zone the trigger was created in.
      return new Date(
        parts.year,
        parts.month - 1,
        parts.day,
        int(parts.hour),
        int(parts.minute),
        int(parts.second),
      ).getTime();
    }

    const recurrence = iosRecurrence(parts);
    if (recurrence) return nextMatch(recurrence, now);
  }

  if (isAndroidRecurrence(raw)) {
    // Android's own shape, in the JS input's ranges — `month` already 0-based.
    return nextMatch(
      {
        month: opt(raw.month),
        day: opt(raw.day),
        weekday: weekdayIndex(raw.weekday),
        hour: int(raw.hour),
        minute: int(raw.minute),
        second: 0,
      },
      now,
    );
  }

  // iOS TIME_INTERVAL — the test notification. It reports the interval it was
  // created with, not a date, so this is an estimate and deliberately last.
  if (typeof raw.seconds === "number") return now + raw.seconds * 1000;

  // Android keeps a real timestamp, under either name depending on version.
  if (typeof raw.value === "number") return raw.value;
  if (typeof raw.date === "number") return raw.date;

  return null;
}
