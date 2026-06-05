import type { ComparatorQuotaDto } from "@subeye/shared";
import { queryOptions } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
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
      assertOk(res);
      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
};
