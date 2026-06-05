import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import { type FC, lazy, type PropsWithChildren, Suspense } from "react";
import { queryClient } from "./client";

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null;

// Upper bound for the persisted snapshot. `buster` (app version) and `maxAge`
// already guard against stale caches; this guards against an oversized one
// (e.g. a power user with thousands of subscriptions). Beyond this, we drop the
// IndexedDB entry instead of letting it accumulate — the in-memory cache is
// untouched and persistence resumes once the snapshot shrinks back under it.
const MAX_PERSISTED_CACHE_BYTES = 4 * 1024 * 1024; // ~4 MB of serialized JSON

const asyncPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      return await get(key);
    },
    setItem: async (key, value) => {
      if (
        typeof value === "string" &&
        value.length > MAX_PERSISTED_CACHE_BYTES
      ) {
        await del(key);
        return;
      }
      await set(key, value);
    },
    removeItem: async (key) => {
      await del(key);
    },
  },
  throttleTime: 1500,
});

export const ReactQueryProvider: FC<PropsWithChildren> = ({ children }) => {
  const handleSuccess = async () => {
    await queryClient.resumePausedMutations();
  };

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncPersister,
        buster: import.meta.env.APP_VERSION,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === "success",
        },
      }}
      onSuccess={handleSuccess}
    >
      {children}
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-right"
          />
        </Suspense>
      ) : null}
    </PersistQueryClientProvider>
  );
};
