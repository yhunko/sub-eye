import type { CashFlowPoint } from "@subeye/model";
import { dateLocale } from "@/shared/i18n";
import { todayAsDay } from "@/shared/lib/format";

/**
 * Logo slots on a day. The overflow chip takes one of them rather than a second
 * row — the same rule the calendar's tiles follow, and for the same reason: a
 * busy day must not be taller than a quiet one inside a strip of one height.
 */
export const RAIL_LOGOS = 2;

export type RailDay = {
  date: string;
  day: number;
  /** "SU", "MO" — the column heading, in the device's regional tag. */
  weekday: string;
  /**
   * "Thursday 3 September" — the same day for VoiceOver.
   *
   * The heading above is two letters, which a screen reader spells out: "tee
   * aitch" where the eye reads Thursday. Composed here rather than in the cell
   * so the whole strip pays for one formatter instead of one per day.
   */
  spoken: string;
  /** What this day charges. Zero for a quiet day, which most of them are. */
  amount: number;
  logos: { key: string; name: string; brandDomain: string | null }[];
  /** Charges the logos do not show, as the "+N" chip's number. Zero for none. */
  hidden: number;
  today: boolean;
  /** The soonest day AFTER today that charges — the one the eye is hunting. */
  next: boolean;
  /** Starts a new week, so it takes a hairline in front of it. */
  weekBreak: boolean;
};

// A known Sunday, so the seven labels come out in `getUTCDay()` order.
const SUNDAY = Date.UTC(2026, 0, 4);

// Built once per locale, exactly as the calendar's weekday header is: the seven
// strings serve every cell of every render, and constructing the formatter is
// the expensive half of formatting. Keyed by locale because `dateLocale()` is
// not constant — Android 13+ swaps the app language with the JS context alive.
const initials = new Map<string, string[]>();

// Same reasoning, and this one earns it twice over: a month is up to 31 cells,
// and a fresh `Intl.DateTimeFormat` per cell is the single most expensive thing
// this strip could do on the screen the app opens on.
const spokenDates = new Map<string, Intl.DateTimeFormat>();

function spokenDateFormat(): Intl.DateTimeFormat {
  const locale = dateLocale();
  const cached = spokenDates.get(locale);
  if (cached) return cached;

  const made = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  spokenDates.set(locale, made);
  return made;
}

/**
 * "SU MO TU …", named by the device's regional tag.
 *
 * Two characters off the locale's own SHORT name rather than `weekday: "narrow"`,
 * which is a single letter in English and gives Tuesday and Thursday the same
 * heading. On a strip where the number below is the only other clue, that is a
 * column the eye cannot place.
 */
function weekdayInitials(): string[] {
  const locale = dateLocale();
  const cached = initials.get(locale);
  if (cached) return cached;

  // Every date this app stores is a UTC midnight, so the formatter reads one.
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "short",
  });
  const labels = Array.from({ length: 7 }, (_, index) =>
    format
      .format(new Date(SUNDAY + index * 86_400_000))
      .slice(0, 2)
      .toUpperCase(),
  );

  initials.set(locale, labels);
  return labels;
}

/**
 * The rest of this month, one cell per day.
 *
 * Built from `cashFlowForecast` — the dashboard's own per-day walk, which Home
 * already holds — rather than from a second projection of the same month. That
 * is what keeps the strip's daily figures adding up to the total printed under
 * it, and it costs no read: `buildCalendarMonth` would repeat the list read and
 * the whole occurrence walk to answer a question already answered.
 *
 * Payments only, because that is all a cash-flow point carries. A trial ending
 * or a price change is a dated NOTICE with no money behind it; those belong to
 * the "Coming up" card, which says what each one is in words.
 *
 * `now` is a parameter for the same reason it is in `deriveAttention` — this has
 * to be testable at a fixed instant.
 */
export function buildRail(
  forecast: readonly CashFlowPoint[],
  now: Date = new Date(),
): RailDay[] {
  const today = todayAsDay(now);
  const labels = weekdayInitials();
  const spoken = spokenDateFormat();
  const rail: RailDay[] = [];
  let markedNext = false;

  for (const point of forecast) {
    const at = Date.parse(point.date);
    // A settled day is money already gone, and the bar under the hero is where
    // it is accounted for. The strip carries only what can still be acted on.
    if (Number.isNaN(at) || at < today) continue;

    const when = new Date(at);
    const charges = point.subscriptions;
    const isToday = at === today;

    // Marked ONCE, and never on today: the ring means "the next time money
    // leaves", which is a different fact from "you are here" — and on a single
    // cell today's own fill would swallow it.
    const next = !isToday && !markedNext && charges.length > 0;
    if (next) markedNext = true;

    const overflowing = charges.length > RAIL_LOGOS;
    const room = overflowing ? RAIL_LOGOS - 1 : RAIL_LOGOS;

    rail.push({
      date: point.date,
      day: when.getUTCDate(),
      weekday: labels[when.getUTCDay()] ?? "",
      spoken: spoken.format(when),
      amount: point.amount,
      logos: charges.slice(0, room).map((charge, index) => ({
        // A cash-flow point carries no subscription id, so the day and the slot
        // are the key. Order is stable within one projection, which is the only
        // lifetime these objects have.
        key: `${point.date}:${index}`,
        name: charge.name,
        brandDomain: charge.brandDomain,
      })),
      hidden: overflowing ? charges.length - room : 0,
      today: isToday,
      next,
      // ponytail: Monday, which is `DEFAULT_CALENDAR_SETTINGS.weekStart`. Wire
      // the calendar's own switch through if a Sunday user ever asks — it lives
      // in another widget's model, so reading it here is not free.
      weekBreak: rail.length > 0 && when.getUTCDay() === 1,
    });
  }

  return rail;
}
