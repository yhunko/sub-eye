import { queryOptions } from "@tanstack/react-query";
import type { ComparatorQuotaDto } from "shared";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { apiClient } from "@/shared/api/client";
import { comparatorQueryKeys } from "../model/query-keys";

type ComparatorQuotaParams = { userId: string };

export const comparatorQuotaQuery = ({
  params,
  options,
}: QueryHook<ComparatorQuotaDto, ComparatorQuotaParams>) => {
  const { userId } = params;

  return queryOptions({
    queryKey: comparatorQueryKeys.quota({ userId }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.comparator.quota.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch comparator quota");
      }

      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
};
