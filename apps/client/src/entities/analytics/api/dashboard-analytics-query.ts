import type { DashboardAnalyticsDto } from "@subeye/shared";
import { queryOptions } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { analyticsQueryKeys } from "../model/query-keys";

type DashboardAnalyticsParams = { userId: string; orgId?: string | null };

export function dashboardAnalyticsQuery({
  params,
  options,
}: QueryHook<DashboardAnalyticsDto, DashboardAnalyticsParams>) {
  const { userId, orgId } = params;

  return queryOptions({
    queryKey: analyticsQueryKeys.dashboard({ userId, orgId }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.analytics.dashboard.$get();
      assertOk(res);
      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
}
