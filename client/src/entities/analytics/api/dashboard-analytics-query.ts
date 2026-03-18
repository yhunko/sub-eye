import { queryOptions } from "@tanstack/react-query";
import type { DashboardAnalyticsDto } from "shared";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { analyticsQueryKeys } from "../model/query-keys";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";

type DashboardAnalyticsParams = { userId: string };

export function dashboardAnalyticsQuery({
  params,
  options,
}: QueryHook<DashboardAnalyticsDto, DashboardAnalyticsParams>) {
  const { userId } = params;

  return queryOptions({
    queryKey: analyticsQueryKeys.dashboard({ userId }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.analytics.dashboard.$get();
      assertOk(res);
      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
}
