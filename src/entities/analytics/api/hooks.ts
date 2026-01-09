import { createQueryKeys } from "@lukemorales/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { getDashboardAnalyticsAction } from "./actions";
import { QueryHook } from "@/shared/lib/react-query";
import { DashboardAnalyticsDto } from "../model/analytics.dtos";
import { useUser } from "@clerk/nextjs";

export const analyticsQueryKeys = createQueryKeys("ANALYTICS", {
  user: (userId: string) => ({
    queryKey: [userId],
    contextQueries: {
      dashboard: null,
    },
  }),
});

export const useDashboardAnalytics = ({
  options,
}: QueryHook<DashboardAnalyticsDto> = {}) => {
  const { user, isLoaded, isSignedIn } = useUser();

  return useQuery({
    queryKey: analyticsQueryKeys.user(user?.id as string)._ctx.dashboard
      .queryKey,
    queryFn: () => getDashboardAnalyticsAction(),
    enabled: isSignedIn && isLoaded,
    ...options,
  });
};
