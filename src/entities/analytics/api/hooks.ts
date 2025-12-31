import { createQueryKeys } from "@lukemorales/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { getDashboardAnalyticsAction } from "./actions";
import { QueryHook } from "@/shared/lib/react-query";
import { DashboardAnalyticsDto } from "../model/analytics.dtos";

export const analyticsQueryKeys = createQueryKeys("ANALYTICS", {
  dashboard: null,
});

export const useDashboardAnalytics = ({
  options,
}: QueryHook<DashboardAnalyticsDto> = {}) => {
  return useQuery({
    queryKey: analyticsQueryKeys.dashboard.queryKey,
    queryFn: () => getDashboardAnalyticsAction(),
    ...options,
  });
};
