import { dateLocale, m } from "@/shared/i18n";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days from `now` to `isoDate`, in UTC.
 *
 * ponytail: UTC, not the user's IANA zone. The server already returns a
 * timezone-correct `daysUntil` on every dashboard renewal — this local version
 * only covers the subscriptions list, where a row that flips a day early at
 * 02:00 in a UTC+3 zone is cosmetic. Swap in the resolved timezone here if that
 * ever bites.
 */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const target = Date.parse(isoDate);
  if (Number.isNaN(target)) return 0;
  const startOfTarget = Math.floor(target / DAY_MS);
  const startOfNow = Math.floor(now.getTime() / DAY_MS);
  return startOfTarget - startOfNow;
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
