import { FC, PropsWithChildren } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  PersistQueryClientProvider,
  Persister,
} from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";
import { queryClient } from "./client";

function throttle<TArgs extends unknown[]>(
  func: (...args: TArgs) => unknown,
  wait: number,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (!timeout) {
      timeout = setTimeout(() => {
        func(...args);
        timeout = null;
      }, wait);
    }
  };
}

const throttledSet = throttle(set, 1000);

const indexedDBPersister: Persister = {
  persistClient: async (client) => {
    await throttledSet("react-query-cache", client);
  },
  restoreClient: async () => {
    return await get("react-query-cache");
  },
  removeClient: async () => {
    await del("react-query-cache");
  },
};

export const ReactQueryProvider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: indexedDBPersister,
        buster: "v1",
        maxAge: 1000 * 60 * 60 * 24,
      }}
    >
      {children}

      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </PersistQueryClientProvider>
  );
};
