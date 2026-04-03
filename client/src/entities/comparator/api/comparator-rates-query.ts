import { queryOptions } from "@tanstack/react-query";
import type { ComparatorRatesDto } from "shared";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { comparatorQueryKeys } from "../model/query-keys";

type ComparatorRatesParams = {
  userId: string;
};

export const comparatorRatesQuery = ({
  params,
  options,
}: QueryHook<ComparatorRatesDto, ComparatorRatesParams>) => {
  const { userId } = params;

  return queryOptions({
    queryKey: comparatorQueryKeys.rates({ userId }).queryKey,
    queryFn: async () => {
      const response = await apiClient.api.comparator.rates.$get();
      if (!response.ok) {
        throw new Error("Failed to fetch comparator rates");
      }

      return response.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
};
