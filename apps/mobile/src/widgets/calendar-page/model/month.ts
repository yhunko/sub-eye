import type { CalendarDayDto } from "@subeye/model";
import { dateLocale } from "@/shared/i18n";
import { daysUntil, formatCountdown, todayAsDay } from "@/shared/lib/format";
import type { WeekStart } from "./settings";

/** A slot in the 7-column grid. A padding slot carries no day and no date. */
export type CalendarCell = {
  key: string;
  day: number | null;
  date: string | null;
};

/**
 * The first day of the month `offset` months from the one we are in, as the UTC
 * midnight every stored date uses.
 *
 * Off `todayAsDay` rather than `now` directly: "which month is it" is a
 * wall-clock question, and reading the UTC month out of a raw instant rolls the
 * calendar over to the next month at 03:00 in Kyiv — and during the previous
 * evening for anyone west of UTC.
 */
export function monthIso(offset: number, now: Date = new Date()): string {
  const today = new Date(todayAsDay(now));
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1),
  ).toISOString();
}

/** Six weeks. Every month fits, and every month is the same height. */
export const GRID_ROWS = 6;

/**
 * The cells of one month, always padded to SIX weeks.
 *
 * Not to the rows the month happens to need: months run four to six, and a
 * pager whose pages are different heights makes everything under it jump while
 * the finger is still moving. Reserving the tallest is what iOS Calendar does,
 * and it costs a row of empty tiles in February to buy a still layout.
 *
 * All UTC: the grid is compared against `CalendarMonthDto.days`, which are
 * calendar days. Building the cells with local `Date` accessors instead puts the
 * 1st in the wrong column for anyone whose offset crosses midnight, which shifts
 * every tile in the month by a day.
 */
export function monthGrid(month: string, weekStart: WeekStart): CalendarCell[] {
  const start = new Date(month);
  const year = start.getUTCFullYear();
  const index = start.getUTCMonth();

  const dayCount = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, index, 1)).getUTCDay();
  const offset = weekStart === "monday" ? (firstWeekday + 6) % 7 : firstWeekday;

  return Array.from({ length: GRID_ROWS * 7 }, (_, slot) => {
    const day = slot - offset + 1;
    if (day < 1 || day > dayCount) {
      return { key: `pad-${slot}`, day: null, date: null };
    }
    const date = new Date(Date.UTC(year, index, day)).toISOString();
    return { key: date, day, date };
  });
}

// A known Sunday, so the seven labels come out in `getUTCDay()` order before
// the week start rotates them.
const SUNDAY = Date.UTC(2026, 0, 4);

/** "Mon Tue Wed …", named by the device's regional tag and rotated to taste. */
export function weekdayLabels(weekStart: WeekStart): string[] {
  const format = new Intl.DateTimeFormat(dateLocale(), {
    weekday: "short",
    timeZone: "UTC",
  });
  const labels = Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(SUNDAY + index * 86_400_000)),
  );
  return weekStart === "monday"
    ? [...labels.slice(1), labels[0] as string]
    : labels;
}

/** "September 2026" — the header, and the month the totals below are scoped to. */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat(dateLocale(), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(month));
}

/** "Sat 12 Sep" — an agenda card's own heading. */
export function agendaDayLabel(date: string): string {
  return new Intl.DateTimeFormat(dateLocale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));
}

/** "Saturday 12 September" — the day sheet's subtitle. */
export function fullDayLabel(date: string): string {
  return new Intl.DateTimeFormat(dateLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(date));
}

/**
 * "Today" / "Tomorrow" / "in N days", but only while it still says something the
 * date beside it does not.
 *
 * Null for a day that has passed and for anything a fortnight out. Both surfaces
 * that show this already name the day, so "in 43 days" next to "Sat 12 Sep" is
 * the same fact twice — and `formatCountdown` alone is WRONG for the past: it
 * branches on `days <= 0`, so every settled day in the month read "Today".
 * Counting backwards is not the fix either; it would need plural forms this app
 * deliberately does not carry (Hermes has no `Intl.PluralRules`).
 */
export function nearbyCountdown(date: string, now: Date = new Date()) {
  const days = daysUntil(date, now);
  return days >= 0 && days < 14 ? formatCountdown(days) : null;
}

/**
 * Whether a day's total is worth printing above its rows.
 *
 * Only when there is an actual SUM — two or more charges. With one, the total
 * and the row's own amount are the same number twice, stacked, which reads as
 * two charges until you check. Non-charging events do not count: a day holding
 * one renewal and one cancellation still totals to the renewal.
 */
export function needsDayTotal(day: CalendarDayDto): boolean {
  return day.events.filter((event) => event.kind === "payment").length > 1;
}
