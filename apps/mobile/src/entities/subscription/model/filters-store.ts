import { useSyncExternalStore } from "react";
import { deviceJson } from "@/shared/lib/mmkv";
import {
  DEFAULT_SUBSCRIPTION_FILTERS,
  parseStoredFilters,
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
 * writer, and a dependency would be 12 KB to replace 15 lines.
 *
 * It PERSISTS, per device, from the moment a filter is changed. The earlier
 * reading — that a filter is a thing you do for the next thirty seconds, and
 * that reopening to a list still narrowed to "Cancelled" would read as missing
 * data — was wrong about how these are used: sort and grouping are a standing
 * preference, not a gesture, and re-picking them on every cold start is the
 * actual annoyance. The "missing data" risk is real but already answered
 * elsewhere: every dimension that HIDES rows lights the header's menu button,
 * and an emptied list says "nothing matches" rather than "nothing here".
 *
 * `search` is the exception and is never restored — see `parseStoredFilters`.
 *
 * MMKV reads synchronously, so the stored set is simply already there on the
 * first render; there is no hydration flash and nothing to await.
 */
const STORAGE_KEY = "subs.filters";

let state: SubscriptionListFilters = parseStoredFilters(
  deviceJson.get<unknown>(STORAGE_KEY, null),
);

/**
 * The dimensions worth remembering. `search` is deliberately absent: the native
 * search bar owns its text and cannot be pre-filled, so a restored term would
 * narrow the list to something with no visible cause.
 */
const PERSISTED = ["status", "categoryId", "sort", "group"] as const;

const persist = (next: SubscriptionListFilters): void => {
  deviceJson.set(STORAGE_KEY, {
    status: next.status,
    categoryId: next.categoryId,
    sort: next.sort,
    group: next.group,
  });
};

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
    // Only when a REMEMBERED dimension moved. `onChangeText` calls this on every
    // keystroke, and search is not persisted — without the guard, typing would
    // rewrite the same four values to disk once per character.
    if (PERSISTED.some((key) => key in patch)) persist(state);
    emit();
  },

  /**
   * Back to defaults, **except the search text**: that is owned by the native
   * search bar, which this cannot clear. Resetting it here would leave the field
   * showing a term that is no longer being applied.
   */
  reset: (): void => {
    state = { ...DEFAULT_SUBSCRIPTION_FILTERS, search: state.search };
    persist(state);
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
