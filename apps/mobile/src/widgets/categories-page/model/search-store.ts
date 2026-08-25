import { useSyncExternalStore } from "react";

/**
 * The category picker's search text, held outside React.
 *
 * It lives here so the native search bar can be declared on the LAYOUT rather
 * than inside the screen. Options set from inside a screen component go through
 * `navigation.setOptions` in an effect that re-runs on every render — so a
 * `useState` here would rebuild the whole `UISearchController` descriptor once
 * per keystroke, which is the same trap the subscriptions list was moved out of
 * (see `(tabs)/subscriptions/_layout.tsx`).
 *
 * ponytail: `useSyncExternalStore` over a module variable, the same shape as
 * `subscriptionFilters`. One string, one writer, one reader.
 *
 * NOT persisted, and cleared when the picker unmounts: the native field owns its
 * own text and cannot be pre-filled, so a term surviving into the next visit
 * would narrow the list with nothing on screen to explain it.
 */
let query = "";

const listeners = new Set<() => void>();

export const categorySearch = {
  get: (): string => query,
  set: (next: string): void => {
    if (next === query) return;
    query = next;
    for (const listener of listeners) listener();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useCategorySearch(): string {
  return useSyncExternalStore(categorySearch.subscribe, categorySearch.get);
}
