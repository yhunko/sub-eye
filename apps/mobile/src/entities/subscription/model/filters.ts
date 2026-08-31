import {
  isCurrentlyActiveSubscription,
  shouldIncludeOccurrence,
} from "@subeye/lifecycle";
import type { SubscriptionDto, SubscriptionStatus } from "@subeye/model";
import { SUBSCRIPTION_GROUP_BYS, type SubscriptionGroupBy } from "./grouping";

// Arrays first, types derived from them. The stored-filter parser below has to
// check a value it read off disk against the allowed set, and a hand-written
// second copy of these lists is a silent bug waiting: add a sort, forget the
// list, and the new one is the only one that never survives a restart.
export const SUBSCRIPTION_SORTS = ["next", "name", "cost"] as const;
export type SubscriptionSort = (typeof SUBSCRIPTION_SORTS)[number];

export const SUBSCRIPTION_STATUS_FILTERS = [
  "all",
  "active",
  "paused",
  "cancelling",
  "cancelled",
] as const;
export type SubscriptionStatusFilter =
  (typeof SUBSCRIPTION_STATUS_FILTERS)[number];

export type SubscriptionListFilters = {
  search: string;
  status: SubscriptionStatusFilter;
  categoryId: string | null;
  sort: SubscriptionSort;
  /** Arranges, never narrows — which is why `hasActiveFilters` ignores it. */
  group: SubscriptionGroupBy;
};

/**
 * "Active" is a QUESTION, not a column value: is this still mine?
 *
 * `cancelling` answers yes. It is an active subscription that happens to have
 * an end date — it still bills, still gives access, and `@subeye/model` already
 * encodes exactly that for spend, which is why this reuses the predicate rather
 * than restating it. Hiding one from the default list meant a subscription the
 * user is still paying for vanished the moment they scheduled its cancellation.
 *
 * It stays reachable under `cancelling` too: one subscription, two true answers.
 */
const matchesStatus = (
  status: SubscriptionStatus,
  filter: SubscriptionStatusFilter,
): boolean => {
  if (filter === "all") return true;
  if (filter === "active") return isCurrentlyActiveSubscription(status);
  return status === filter;
};

/**
 * Active-only, deliberately: the list is what you are paying for, and a
 * cancelled subscription from last year is history, not inventory. The other
 * statuses are a tap away in the filter sheet.
 *
 * `hasActiveFilters` compares against THIS object, not against a neutral
 * baseline — so the default view leaves the header's menu button plain, and
 * switching to "All" tints it. Change one and the other follows.
 */
export const DEFAULT_SUBSCRIPTION_FILTERS: SubscriptionListFilters = {
  search: "",
  status: "active",
  categoryId: null,
  sort: "next",
  group: "none",
};

/**
 * The subscriptions charging on `day`, a `YYYY-MM-DD` calendar date in UTC —
 * the zone every date in this app is stored and rendered in.
 *
 * Backs the deep link on a digest reminder: a notification that named three
 * services has to open a screen showing exactly those three — so the test for
 * "does this charge" has to be the planner's, not a narrower one. A dead or
 * paused subscription still carries a `nextPaymentDate` that will never be
 * taken; a `cancelling` one is charged for every occurrence strictly before
 * `willBeCancelledAt` and belongs on the day it lands on.
 *
 * Compares the ISO prefix rather than re-parsing: `nextPaymentDate` is always
 * UTC midnight, so the first ten characters ARE the calendar day, and `new Date`
 * would drag the device's zone into a comparison that must not depend on it.
 */
export function subscriptionsDueOn(
  items: readonly SubscriptionDto[],
  day: string,
): SubscriptionDto[] {
  return items
    .filter(
      (item) =>
        item.nextPaymentDate.slice(0, 10) === day &&
        isCurrentlyActiveSubscription(item.status) &&
        // UTC midnight, so this parse carries no zone — unlike comparing `day`
        // itself, which is why the day test above stays a string prefix.
        shouldIncludeOccurrence(item, new Date(item.nextPaymentDate)),
    )
    .sort((a, b) => b.billing.preferred.amount - a.billing.preferred.amount);
}

/**
 * Search, filter and sort the cached list — locally, over an array the client
 * already holds.
 *
 * This replaces a server round-trip per debounced keystroke in the retired web
 * client. It is a linear scan over tens of rows; it runs inside a useMemo in the
 * widget and is imperceptible. If a user ever reaches thousands of subscriptions,
 * add cursor paging + SQL search back — do not pre-optimise for it now.
 */
export function applySubscriptionFilters(
  items: readonly SubscriptionDto[],
  filters: SubscriptionListFilters,
): SubscriptionDto[] {
  const needle = filters.search.trim().toLowerCase();

  const matched = items.filter((item) => {
    if (!matchesStatus(item.status, filters.status)) return false;
    if (filters.categoryId && item.category?.id !== filters.categoryId) {
      return false;
    }
    if (!needle) return true;
    return (
      item.name.toLowerCase().includes(needle) ||
      (item.category?.name.toLowerCase().includes(needle) ?? false)
    );
  });

  // .filter() already returned a fresh array, so sorting it in place cannot touch
  // the query cache's array.
  return matched.sort((a, b) => {
    switch (filters.sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "cost":
        return b.billing.preferred.monthly - a.billing.preferred.monthly;
      default:
        return Date.parse(a.nextPaymentDate) - Date.parse(b.nextPaymentDate);
    }
  });
}

const oneOf = <T extends string>(
  allowed: readonly T[],
  value: unknown,
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

/**
 * A filter set read back off the device, validated down to something the list
 * can actually apply.
 *
 * Never throws and never trusts: the blob was written by an older build, or by
 * a build that spelled a status differently, and an unrecognised value would
 * silently match no rows — an empty list with no visible reason is the worst
 * outcome this whole feature can produce. Anything unknown falls back to its
 * default rather than being kept.
 *
 * **`search` is always empty, whatever was stored.** The text belongs to the
 * native UISearchBar, which this cannot pre-fill — restoring the term would
 * narrow the list to something the user cannot see, cannot explain and cannot
 * clear without guessing. The other four all announce themselves: the header's
 * menu button is tinted and filled whenever one of them is hiding rows.
 *
 * A `categoryId` whose category has since been deleted is left as it is. It
 * narrows the list to nothing, but the lit menu button and the "nothing matches"
 * empty state both say so, and clearing it here would need the category list,
 * which this cannot reach.
 */
export function parseStoredFilters(raw: unknown): SubscriptionListFilters {
  const stored = (
    typeof raw === "object" && raw !== null ? raw : {}
  ) as Partial<SubscriptionListFilters>;

  return {
    search: "",
    status: oneOf(
      SUBSCRIPTION_STATUS_FILTERS,
      stored.status,
      DEFAULT_SUBSCRIPTION_FILTERS.status,
    ),
    categoryId:
      typeof stored.categoryId === "string" && stored.categoryId
        ? stored.categoryId
        : null,
    sort: oneOf(
      SUBSCRIPTION_SORTS,
      stored.sort,
      DEFAULT_SUBSCRIPTION_FILTERS.sort,
    ),
    group: oneOf(
      SUBSCRIPTION_GROUP_BYS,
      stored.group,
      DEFAULT_SUBSCRIPTION_FILTERS.group,
    ),
  };
}
