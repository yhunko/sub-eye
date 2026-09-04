import type { CalendarDayDto } from "@subeye/model";
import { dateLocale } from "@/shared/i18n";
import {
  daysUntil,
  formatCountdown,
  todayAsDay,
  weekdayNames,
} from "@/shared/lib/format";
import type { WeekStart } from "./settings";

/**
 * A slot in the 7-column grid.
 *
 * EVERY slot is a real day. `adjacent` marks the ones belonging to the month
 * before or after, which fill the grid rather than leaving it: a fixed six rows
 * means most months end on a band of empty cells, and a blank quarter-screen
 * under the last week reads as something that failed to load.
 */
export type CalendarCell = {
  key: string;
  day: number;
  date: string;
  adjacent: boolean;
};

/**
 * `Intl.DateTimeFormat` instances, kept per locale and per shape.
 *
 * Constructing one is the expensive part of formatting, and this screen used to
 * build a fresh formatter for EVERY agenda heading and every grid — a month with
 * thirty populated days paid for thirty constructions per render, times the
 * three months the pager keeps mounted.
 *
 * Keyed by locale as well as shape because `dateLocale()` is not constant: the
 * app follows the device's regional tag, and Android 13+ can swap the app
 * language with the JS context alive.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(
  shape: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const locale = dateLocale();
  const key = `${locale}|${shape}`;
  const cached = formatters.get(key);
  if (cached) return cached;

  // Every date this app stores is a UTC midnight, so every formatter reads one.
  const made = new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });
  formatters.set(key, made);
  return made;
}

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

/**
 * The inverse of `monthIso` — how many months `month` sits from the current one.
 *
 * Counted in whole months rather than divided out of a millisecond difference,
 * which is off by one for any pair straddling a 28-day February.
 */
export function monthOffsetOf(month: string, now: Date = new Date()): number {
  const today = new Date(todayAsDay(now));
  const target = new Date(month);
  return (
    (target.getUTCFullYear() - today.getUTCFullYear()) * 12 +
    (target.getUTCMonth() - today.getUTCMonth())
  );
}

/** Six weeks. Every month fits, and every month is the same height. */
export const GRID_ROWS = 6;

/**
 * The cells of one month, always SIX weeks, with the neighbouring months
 * filling whatever the month itself does not.
 *
 * Six rows rather than the rows the month happens to need: months run four to
 * six, and a pager whose pages are different heights makes everything under it
 * jump while the finger is still moving. Reserving the tallest is what iOS
 * Calendar does — and it is also why the overflow has to be filled rather than
 * left blank, because February on a Monday start reserves two rows it never
 * uses.
 *
 * `Date.UTC` normalises an out-of-range day for free: day 0 is the last of the
 * previous month, day 32 is the 1st of the next. Deriving the neighbours by hand
 * means a month-length table and a year rollover, both of which this does not
 * need to know about.
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
    const at = new Date(Date.UTC(year, index, day));
    const date = at.toISOString();
    return {
      key: date,
      day: at.getUTCDate(),
      date,
      adjacent: day < 1 || day > dayCount,
    };
  });
}

/** The month `offset` months either side of `month`, as its own first day. */
export function siblingMonth(month: string, offset: number): string {
  const start = new Date(month);
  return new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1),
  ).toISOString();
}

// The ROTATION is what is cached here; the seven names themselves come from
// `weekdayNames`, which the home rail reads too — one source, so the strip and
// this grid cannot drift apart on what to call a Tuesday.
const weekdays = new Map<string, string[]>();

/** "Mon Tue Wed …", named by the device's regional tag and rotated to taste. */
export function weekdayLabels(weekStart: WeekStart): string[] {
  const key = `${dateLocale()}|${weekStart}`;
  const cached = weekdays.get(key);
  if (cached) return cached;

  const labels = weekdayNames();
  const rotated =
    weekStart === "monday" ? [...labels.slice(1), labels[0] as string] : labels;

  weekdays.set(key, rotated);
  return rotated;
}

/** "September 2026" — the header, and the month the totals below are scoped to. */
export function monthLabel(month: string): string {
  return formatter("month", { month: "long", year: "numeric" }).format(
    new Date(month),
  );
}

/** "September" — a month named on its own, inside a year that already says which. */
export function monthNameLabel(month: string): string {
  return formatter("monthName", { month: "long" }).format(new Date(month));
}

/** "Sat 12 Sep" — an agenda card's own heading. */
export function agendaDayLabel(date: string): string {
  return formatter("agendaDay", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

/** "Saturday 12 September" — the day sheet's subtitle. */
export function fullDayLabel(date: string): string {
  return formatter("fullDay", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

/** How many of a day's events are money actually leaving the account. */
export function chargeCount(day: CalendarDayDto): number {
  return day.events.filter((event) => event.kind === "payment").length;
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
  return chargeCount(day) > 1;
}

/** What makes a day worth warning about, rather than merely busy. */
export const HEAVY_DAY_CHARGES = 2;
export const HEAVY_DAY_SHARE = 0.25;

/**
 * A day that lands a real share of the month in one go.
 *
 * BOTH conditions, and each rules out a different false positive. A share alone
 * flags the only charge in a quiet month, which is not a pile-up and tells the
 * user nothing. A count alone flags four €3 charges in a month that spends
 * €900, which is noise on the one screen that must not cry wolf.
 *
 * A quarter of the month is the threshold because four such days would BE the
 * month: below that a day is simply one of several, and the flag would end up on
 * most of them.
 *
 * Deliberately relative, not a currency amount. A fixed floor would fire on
 * every day for a hryvnia user and never for a dollar one, and there is no rate
 * table in a pure display rule.
 */
export function isHeavyDay(day: CalendarDayDto, monthTotal: number): boolean {
  return (
    monthTotal > 0 &&
    chargeCount(day) >= HEAVY_DAY_CHARGES &&
    day.total >= monthTotal * HEAVY_DAY_SHARE
  );
}

/**
 * The month-over-month move, or `null` when there is nothing to compare against.
 *
 * Rounded to WHOLE UNITS before the comparison, exactly as Home's next-month
 * chip is and for the same reason: the chip prints whole units, so a 40-kopeck
 * drift would otherwise render a red arrow next to "₴0 more".
 *
 * Null for an unchanged month as well as for an empty previous one. "↑ ₴0" is a
 * line that costs a fold to say nothing, and two months being equal is what an
 * unchanged set of subscriptions looks like every month of the year — which is
 * the common case, not the edge one. The delta earns its place only when it
 * moved.
 */
export function monthDelta(
  monthTotal: number,
  previousMonthTotal: number,
): { amount: number; up: boolean } | null {
  if (previousMonthTotal <= 0) return null;
  const amount = Math.round(monthTotal) - Math.round(previousMonthTotal);
  if (amount === 0) return null;
  return { amount: Math.abs(amount), up: amount > 0 };
}
