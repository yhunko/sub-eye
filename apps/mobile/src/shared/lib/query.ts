import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  hydrate,
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { persistQueryClientSubscribe } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import { ApiError } from "@/shared/api";
import { mmkvStorage } from "./mmkv";
import { CACHE_KEY, readPersistedCache } from "./persisted-cache";
import { reportError } from "./sentry";

// THE BLIND SPOT SENTRY WOULD OTHERWISE HAVE. Query catches every error a
// queryFn or a mutation throws, so none of them reaches the error boundary or a
// global handler — the screen renders its error state and the cause is never
// seen again. Nearly every screen in the app loads through Query, so without
// this the reporting covers render crashes and almost nothing else.
//
// A 4xx ApiError is not a bug: 401 is an expired session, 404 a row deleted on
// another device, 409 a conflict the form already explains. Everything else is —
// a 5xx, or a TypeError thrown by our own parsing on a payload we did not expect.
const reportUnexpected = (
  error: unknown,
  source: "query" | "mutation",
): void => {
  if (error instanceof ApiError && error.status < 500) return;
  reportError(error, { source });
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => reportUnexpected(error, "query"),
  }),
  mutationCache: new MutationCache({
    onError: (error) => reportUnexpected(error, "mutation"),
  }),
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

const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Bump this on any over-the-air update that changes a persisted DTO shape. A
// store release bumps expo.version and busts the cache for free; this covers
// shape changes shipped OTA, which do not touch the version.
const PERSIST_SCHEMA = "1";
const buster = `${Constants.expoConfig?.version ?? ""}-${PERSIST_SCHEMA}`;

const persister = createAsyncStoragePersister({
  storage: mmkvStorage,
  key: CACHE_KEY,
  throttleTime: 1000,
});

// HYDRATE BEFORE THE FIRST RENDER, and deliberately NOT through
// PersistQueryClientProvider. That component kicks its restore off inside a
// useEffect, so the cache is still empty for the frame React has already
// committed — and that frame is the full-page spinner. MMKV reads
// synchronously, so the data can simply be there already.
//
// Module scope is load-bearing: this runs when `queryClient` is imported, before
// any provider mounts.
const restored = readPersistedCache(mmkvStorage.getItem(CACHE_KEY), {
  now: Date.now(),
  buster,
  maxAge: MAX_AGE,
});

if (restored) {
  hydrate(queryClient, restored);
} else {
  // Expired, busted or corrupt — drop it rather than leave a blob that will be
  // re-read and re-rejected on every launch.
  mmkvStorage.removeItem(CACHE_KEY);
}

// Saving still goes through TanStack. Subscribing immediately, rather than after
// a restore resolves, is what keeps queries unpaused — so a stale screen
// refetches behind the cached numbers instead of blocking on them.
//
// ponytail: never unsubscribed — it lives exactly as long as the JS context.
persistQueryClientSubscribe({
  queryClient,
  persister,
  // No maxAge here — it is a restore-time rule, and the restore above applies it.
  buster,
  dehydrateOptions: {
    // Everything the app owns is worth a cold start. Brand search is not: it is
    // a third party's data, its terms say it is fetched live and not persisted,
    // and its query key is whatever the user typed into the search bar. A query
    // opts out with `meta: { persist: false }` rather than being named here.
    // The status check is TanStack's own default, which this replaces.
    shouldDehydrateQuery: (query) =>
      query.state.status === "success" && query.meta?.persist !== false,
  },
});
