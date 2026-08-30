/**
 * A picker's search text, held outside React.
 *
 * It exists so a native search bar can be declared on the LAYOUT rather than
 * inside the screen. Options set from inside a screen component go through
 * `navigation.setOptions` in an effect that re-runs on every render — so a
 * `useState` here would rebuild the whole `UISearchController` descriptor once
 * per keystroke, which is the trap the subscriptions list was moved out of
 * (see `(tabs)/subscriptions/_layout.tsx`).
 *
 * ponytail: `useSyncExternalStore` over a closed-over string. One value, one
 * writer, one reader — the same shape as `subscriptionFilters`.
 *
 * NEVER persisted, and every caller clears it when its picker unmounts: the
 * native field owns its own text and cannot be pre-filled, so a term surviving
 * into the next visit would narrow the list with nothing on screen to explain it.
 */
export type SearchStore = {
  get: () => string;
  set: (next: string) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createSearchStore(): SearchStore {
  let query = "";
  const listeners = new Set<() => void>();

  return {
    get: () => query,
    set: (next) => {
      if (next === query) return;
      query = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
