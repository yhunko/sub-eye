import { buildMonthlySummary } from "@subeye/store";
import { useQuery } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";

export const monthlySummaryKeys = {
  all: ["analytics", "monthly-summary"] as const,
};

/**
 * The only source of a PREVIOUS month.
 *
 * The dashboard's own `totalUpcomingMonth` counts a different population
 * (analytics-eligible, currently-active subscriptions only), so the widget's
 * "this month" and "vs last month" both come from here rather than straddling
 * two projections for one subtraction.
 */
export function useMonthlySummary() {
  return useQuery({
    queryKey: monthlySummaryKeys.all,
    queryFn: () => buildMonthlySummary(localPorts),
  });
}
