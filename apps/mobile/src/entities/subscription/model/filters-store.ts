import { useSyncExternalStore } from "react";
import {
  DEFAULT_SUBSCRIPTION_FILTERS,
  type SubscriptionListFilters,
} from "./filters";

/**
 * The list's filter state, held outside React.
 *
 * It has to live somewhere both the list screen and Android's fallback sheet can
 * reach, and those are two different **routes** — the navigator owns sheet
 * presentation in this app, so the sheet cannot be a child of the page and
 * cannot read its `useState`.
 *
 * ponytail: `useSyncExternalStore` over a module variable, not a state library.
 * React ships the primitive for exactly this, the store is one value with one
 * writer, and a dependency would be 12 KB to replace 15 lines. It is deliberately
 * NOT persisted — a filter is a thing you do for the next thirty seconds, and a
 * user reopening the app to a list still narrowed to "Cancelled" from last week
 * would read as missing data.
 */
let state: SubscriptionListFilters = DEFAULT_SUBSCRIPTION_FILTERS;

const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export const subscriptionFilters = {
  // Returns the same reference until something actually writes, which is what
  // useSyncExternalStore requires — a fresh object per call is an infinite loop.
  get: (): SubscriptionListFilters => state,

  set: (patch: Partial<SubscriptionListFilters>): void => {
    state = { ...state, ...patch };
    emit();
  },

  /**
   * Back to defaults, **except the search text**: that is owned by the native
   * search bar, which this cannot clear. Resetting it here would leave the field
   * showing a term that is no longer being applied.
   */
  reset: (): void => {
    state = { ...DEFAULT_SUBSCRIPTION_FILTERS, search: state.search };
    emit();
  },

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useSubscriptionFilters(): SubscriptionListFilters {
  return useSyncExternalStore(
    subscriptionFilters.subscribe,
    subscriptionFilters.get,
  );
}

/**
 * Whether anything is HIDING rows right now — what tints the header's menu
 * button. Search is excluded: the search bar shows its own state, and a
 * permanently-lit button while typing would say nothing.
 *
 * `sort` and `group` are excluded too. Neither removes a row, and a tinted
 * button that only means "arranged differently" trains the user to ignore the
 * one signal that means "you are not seeing everything".
 */
export function hasActiveFilters(filters: SubscriptionListFilters): boolean {
  return (
    filters.status !== DEFAULT_SUBSCRIPTION_FILTERS.status ||
    filters.categoryId !== DEFAULT_SUBSCRIPTION_FILTERS.categoryId
  );
}
