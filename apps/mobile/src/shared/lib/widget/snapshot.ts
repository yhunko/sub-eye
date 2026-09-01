import type { UpcomingRenewalDto } from "@subeye/model";
import { dateLocale, m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";

/** Bump when a field the Swift `Codable` reads is renamed, removed or retyped. */
export const WIDGET_SCHEMA = 1;

/** How many renewals the medium widget has room for. */
const ITEM_LIMIT = 3;

export type WidgetItem = {
  id: string;
  name: string;
  /** Favicon lookup key. The widget fetches the logo itself; nothing is bundled. */
  domain: string | null;
  amount: string;
  /**
   * ISO instant, NOT a formatted string. It is the one field the widget renders
   * itself (`Text(_:format: .relative)`), because a snapshot written yesterday
   * would otherwise still read "tomorrow" — WidgetKit refreshes the timeline on
   * its own schedule and the app is not running to rewrite the copy.
   */
  date: string;
};

/**
 * Everything the iOS widgets draw, already worded and formatted.
 *
 * The extension carries NO formatting logic on purpose: currency symbols,
 * decimal separators and every label come from the app's own `formatMoney` and
 * Paraglide catalogs, so the widget cannot drift from the screen it mirrors and
 * there is no second place to translate. The cost is that a locale change has
 * to rewrite the snapshot — it does, `syncWidget` runs on every foreground.
 */
export type WidgetSnapshot = {
  v: number;
  locked: boolean;
  lockTitle: string;
  lockCta: string;
  monthLabel: string;
  monthTotal: string;
  upcomingLabel: string;
  emptyLabel: string;
  /** Absolute amount; the arrow carries the sign. Null when there is nothing to compare. */
  delta: string | null;
  /** What the delta is measured against — a caption under the pill, not inside it. */
  deltaLabel: string;
  deltaUp: boolean;
  /** "+2 also due" under the small widget's headline event, or null. */
  alsoDue: string | null;
  /**
   * The tag the extension formats `WidgetItem.date` with — the ONE string it
   * still words itself, and therefore the one place it can contradict the app.
   * Without this it falls back to the extension process's own `Locale.current`,
   * which follows the DEVICE, so an app running under a per-app language shows
   * "Next payment · сьогодні" with an English label above it.
   */
  locale: string;
  items: WidgetItem[];
};

export type WidgetSnapshotInput = {
  /** Already resolved against the Pro entitlement by the caller. */
  locked: boolean;
  currency: string;
  monthTotal: number;
  /** Null while the monthly summary has not loaded — the delta simply hides. */
  previousMonthTotal: number | null;
  upcoming: UpcomingRenewalDto[];
};

export function buildWidgetSnapshot(
  input: WidgetSnapshotInput,
): WidgetSnapshot {
  const base = {
    v: WIDGET_SCHEMA,
    lockTitle: m.paywall_lockWidgets(),
    lockCta: m.paywall_unlock(),
    monthLabel: m.widget_thisMonth(),
    upcomingLabel: m.widget_upcoming(),
    emptyLabel: m.widget_nothingDue(),
    deltaLabel: m.widget_vsLastMonth(),
    locale: dateLocale(),
  };

  // A locked snapshot keeps the month TOTAL and gives up everything else.
  //
  // It used to carry no figures at all, which made the strongest passive
  // surface iOS has deliver nothing — a blank lock card earns its place on a
  // Home Screen for about a day before it is deleted, and a deleted widget
  // cannot sell anything either. The total is already free inside the app, on
  // Home, so withholding it here bought no leverage.
  //
  // What stays withheld is what the shoulder-surfing argument was ever really
  // about: WHICH services, on WHAT day, for HOW much. A Home Screen is visible
  // to whoever is standing behind the user, and a list of named subscriptions
  // is the part of this that is nobody else's business.
  //
  // `delta` stays null because the month-over-month comparison is itself Pro on
  // the calendar screen — handing it over here would be a different feature
  // leaking, not a considered giveaway.
  if (input.locked) {
    return {
      ...base,
      locked: true,
      monthTotal: formatMoney(input.monthTotal, input.currency),
      delta: null,
      deltaUp: false,
      alsoDue: null,
      items: [],
    };
  }

  // Rounded to whole units before comparing, because the pill prints whole
  // units: a 40-kopeck drift would otherwise draw an arrow next to "0".
  const previous = input.previousMonthTotal;
  const change =
    previous === null ? 0 : Math.round(input.monthTotal) - Math.round(previous);

  // ponytail: `upcoming` is the dashboard's list, which the server slices to 5.
  // Six renewals on one morning would therefore report "+4 also due". Raise the
  // slice in `getDashboardStats` if that ever matters more than the payload.
  const first = input.upcoming[0];
  const alsoDue = first
    ? input.upcoming.filter(
        (renewal, index) => index > 0 && renewal.daysUntil === first.daysUntil,
      ).length
    : 0;

  return {
    ...base,
    locked: false,
    monthTotal: formatMoney(input.monthTotal, input.currency, { decimals: 0 }),
    delta:
      change === 0
        ? null
        : formatMoney(Math.abs(change), input.currency, { decimals: 0 }),
    deltaUp: change > 0,
    alsoDue: alsoDue > 0 ? m.widget_alsoDue({ count: alsoDue }) : null,
    items: input.upcoming.slice(0, ITEM_LIMIT).map((renewal) => ({
      id: renewal.id,
      name: renewal.name,
      domain: renewal.brandDomain,
      amount: formatMoney(renewal.amount, renewal.currencyCode),
      date: renewal.nextPaymentDate,
    })),
  };
}
