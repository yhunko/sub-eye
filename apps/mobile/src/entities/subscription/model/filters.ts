import type { SubscriptionDto } from "@subeye/shared";

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
};

export const DEFAULT_SUBSCRIPTION_FILTERS: SubscriptionListFilters = {
  search: "",
  status: "all",
  categoryId: null,
  sort: "next",
};

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
    if (filters.status !== "all" && item.status !== filters.status)
      return false;
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
