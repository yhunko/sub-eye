import type { SubscriptionDto, SubscriptionStatus } from "@subeye/shared";
import { isCurrentlyActiveSubscription } from "@subeye/shared";
import type { SubscriptionGroupBy } from "./grouping";

export type SubscriptionSort = "next" | "name" | "cost";
export type SubscriptionStatusFilter =
  | "all"
  | "active"
  | "paused"
  | "cancelling"
  | "cancelled";

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
 * an end date — it still bills, still gives access, and `@subeye/shared` already
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
 * services has to open a screen showing exactly those three. Active only, for
 * the same reason the planner schedules active only — the server still computes
 * a `nextPaymentDate` for a cancelled subscription, and it will never be taken.
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
        item.status === "active" && item.nextPaymentDate.slice(0, 10) === day,
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
