import { useSyncExternalStore } from "react";
import { createSearchStore } from "@/shared/lib/search-store";

/** The currency picker's search text. See `createSearchStore` for the why. */
export const currencySearch = createSearchStore();

export function useCurrencySearch(): string {
  return useSyncExternalStore(currencySearch.subscribe, currencySearch.get);
}
