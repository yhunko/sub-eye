import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { mmkvStorage } from "./mmkv";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // Keep data across a week of cold starts so the app opens with numbers,
      // not a spinner.
      gcTime: 7 * 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: mmkvStorage,
  throttleTime: 1000,
});

// Bump this on any over-the-air update that changes a persisted DTO shape. A
// store release bumps expo.version and busts the cache for free; this covers
// shape changes shipped OTA, which do not touch the version.
const PERSIST_SCHEMA = "1";

export const persistOptions = {
  persister,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  buster: `${Constants.expoConfig?.version ?? ""}-${PERSIST_SCHEMA}`,
  // Persist every successful query. With seven screens there is no query worth
  // excluding; add a shouldDehydrateQuery filter only when one appears.
  dehydrateOptions: {},
};
