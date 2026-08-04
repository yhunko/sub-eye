import { dateLocale, m } from "@/shared/i18n";
import { todayAsDay } from "./day";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days from today to `isoDate`.
 *
 * Both sides are day values, so the subtraction is exact. "Today" comes from
 * the DEVICE's calendar (`todayAsDay`) rather than from UTC's: the two differ
 * for the length of the user's offset, which is a countdown reading "tomorrow"
 * for something due today between midnight and 03:00 in Kyiv.
 */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const target = Date.parse(isoDate);
  if (Number.isNaN(target)) return 0;
  // Floored rather than trusted: a stored day is already a UTC midnight, but a
  // legacy row predating the normalisation carries a time of day.
  const startOfTarget = Math.floor(target / DAY_MS) * DAY_MS;
  return Math.round((startOfTarget - todayAsDay(now)) / DAY_MS);
}

/**
 * "Today" / "Tomorrow" / "in N days", however far out. The detail screen shows
 * this next to the concrete date, so the date branch below would only repeat it.
 */
export function formatCountdown(days: number): string {
  if (days <= 0) return m.when_today();
  if (days === 1) return m.when_tomorrow();
  return m.when_inDays({ days });
}

/**
 * "326 days left" — the same distance as `formatCountdown`, worded as a window
 * running out rather than as an event approaching.
 *
 * "In 326 days" is right for something that will happen (a payment, a resume)
 * and wrong for something you still have (access until a cancellation date).
 * Today and tomorrow read the same either way, so only the counted branch
 * differs — and it starts at 2, which is why the English plural is safe to
 * spell without `Intl.PluralRules`.
 */
export function formatRemaining(days: number): string {
  if (days <= 0) return m.when_today();
  if (days === 1) return m.when_tomorrow();
  return m.when_daysLeft({ days });
}

/** "1 August 2026" — the concrete day, for the one place a countdown names it. */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(dateLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

/**
 * "3 Aug", or "5 Feb 2027" once the year stops being obvious.
 *
 * The only shape a past date gets: a countdown cannot run backwards without
 * plural forms this app deliberately does not carry (Hermes has no
 * Intl.PluralRules, so every plural is spelled per locale in the catalog), and
 * "ended 47 days ago" is not worth three Ukrainian spellings of "days".
 */
export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return new Intl.DateTimeFormat(dateLocale(), {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(date);
}

/**
 * "Today" / "Tomorrow" / "in N days" up to a fortnight out, then a short date.
 * `isoDate` is only read for the date branch, so callers can pass the server's
 * timezone-correct `daysUntil` alongside the raw date.
 */
export function formatDaysUntil(days: number, isoDate: string): string {
  if (days < 14) return formatCountdown(days);
  return formatShortDate(isoDate);
}
