import { m } from "@/shared/i18n";

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

/** "1 August 2026" — the concrete day, for the one place a countdown names it. */
export function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

/**
 * "Today" / "Tomorrow" / "in N days" up to a fortnight out, then a short date.
 * `isoDate` is only read for the date branch, so callers can pass the server's
 * timezone-correct `daysUntil` alongside the raw date.
 */
export function formatDaysUntil(days: number, isoDate: string): string {
  if (days < 14) return formatCountdown(days);

  const date = new Date(isoDate);
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(date);
}
