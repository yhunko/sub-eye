import { dateLocale } from "@/shared/i18n";

// A known Sunday, so the seven names come out in `getUTCDay()` order and any
// caller that wants a Monday-first week rotates them itself.
const SUNDAY = Date.UTC(2026, 0, 4);

/**
 * Built once per locale. The seven strings serve every cell of every render —
 * a month grid is 42 of them and the home rail is up to 31 — and constructing
 * the formatter is the expensive half of formatting.
 *
 * Keyed by locale because `dateLocale()` is not constant: Android 13+ swaps the
 * app language with the JS context still alive.
 */
const cache = new Map<string, string[]>();

/**
 * "Mon", "Tue" … in `getUTCDay()` order, so index 0 is Sunday.
 *
 * ONE source for both surfaces that name a weekday. The calendar's header and
 * the home rail each had their own copy, and they disagreed: the rail cut the
 * locale's short name to two letters and upper-cased it in the model, so the
 * same Tuesday read "TU" above the hero and "TUE" one tab across.
 *
 * The locale's own short name, never `weekday: "narrow"` — narrow is a single
 * letter in English and gives Tuesday and Thursday the same heading, which on a
 * strip where the date below is the only other clue is a column the eye cannot
 * place. Casing belongs to the caller's stylesheet, not here.
 */
export function weekdayNames(): string[] {
  const locale = dateLocale();
  const cached = cache.get(locale);
  if (cached) return cached;

  // Every date this app stores is a UTC midnight, so the formatter reads one.
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "short",
  });
  const names = Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(SUNDAY + index * 86_400_000)),
  );

  cache.set(locale, names);
  return names;
}
