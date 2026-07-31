import { useQuery } from "@tanstack/react-query";
import { apiClient, assertOk } from "@/shared/api";

export const monthlySummaryKeys = {
  all: ["analytics", "monthly-summary"] as const,
};

/**
 * GET /api/analytics/monthly-summary — the only source of a PREVIOUS month.
 *
 * The dashboard's own `totalUpcomingMonth` counts a different population
 * (analytics-eligible, currently-active subscriptions only), so the widget's
 * "this month" and "vs last month" both come from here rather than straddling
 * two endpoints for one subtraction.
 */
export function useMonthlySummary() {
  return useQuery({
    queryKey: monthlySummaryKeys.all,
    queryFn: async () => {
      const res = await apiClient.api.analytics["monthly-summary"].$get();
      assertOk(res);
      return res.json();
    },
  });
}
