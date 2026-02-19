import { FC, PropsWithChildren } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { queryClient } from "./client";

const asyncPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      return await get(key);
    },
    setItem: async (key, value) => {
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
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </PersistQueryClientProvider>
  );
};
