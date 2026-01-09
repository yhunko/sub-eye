"use client";

import { FC, PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "./client";

export const ReactQueryProvider: FC<PropsWithChildren> = ({ children }) => {
  const client = getQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}

      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
};
