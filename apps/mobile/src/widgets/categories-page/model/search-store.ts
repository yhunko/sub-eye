import { useSyncExternalStore } from "react";
import { createSearchStore } from "@/shared/lib/search-store";

/** The category picker's search text. See `createSearchStore` for the why. */
export const categorySearch = createSearchStore();

export function useCategorySearch(): string {
  return useSyncExternalStore(categorySearch.subscribe, categorySearch.get);
}
