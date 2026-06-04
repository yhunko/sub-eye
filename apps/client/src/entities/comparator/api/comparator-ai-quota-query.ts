import type { ComparatorAiQuotaDto } from "@subeye/shared";
import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { comparatorQueryKeys } from "../model/query-keys";

type ComparatorAiQuotaParams = {
  userId: string;
};

export const comparatorAiQuotaQuery = ({
  params,
  options,
}: QueryHook<ComparatorAiQuotaDto, ComparatorAiQuotaParams>) => {
  const { userId } = params;

  return queryOptions({
    queryKey: comparatorQueryKeys.aiQuota({ userId }).queryKey,
    queryFn: async () => {
      const response = await apiClient.api.comparator["ai-quota"].$get();
      if (!response.ok) {
        throw new Error("Failed to fetch comparator AI quota");
      }

      return response.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
};
