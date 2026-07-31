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
 */

type Components = {
  year?: unknown;
  month?: unknown;
  day?: unknown;
  hour?: unknown;
  minute?: unknown;
  second?: unknown;
};

const int = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function triggerTime(trigger: unknown, now: number): number | null {
  if (!trigger || typeof trigger !== "object") return null;

  const raw = trigger as {
    dateComponents?: Components;
    seconds?: unknown;
    value?: unknown;
    date?: unknown;
  };

  const parts = raw.dateComponents;
  if (
    parts &&
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

  // iOS TIME_INTERVAL — the test notification. It reports the interval it was
  // created with, not a date, so this is an estimate and deliberately last.
  if (typeof raw.seconds === "number") return now + raw.seconds * 1000;

  // Android keeps a real timestamp, under either name depending on version.
  if (typeof raw.value === "number") return raw.value;
  if (typeof raw.date === "number") return raw.date;

  return null;
}
