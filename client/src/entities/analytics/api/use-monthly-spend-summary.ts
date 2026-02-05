import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import type { MonthlySpendSummaryDto } from "@shared/domains/analytics";
import { analyticsQueryKeys } from "../model/query-keys";

export const monthlySpendSummaryQuery = (
  options?: QueryHook<MonthlySpendSummaryDto>,
) => ({
  queryKey: analyticsQueryKeys.monthlySpend.queryKey,
  queryFn: async () => {
    const res = await apiClient.api.analytics["monthly-summary"].$get();
    if (!res.ok) {
      throw new Error("Failed to fetch monthly spend summary");
    }
    return await res.json();
  },
  ...options,
});

export const useMonthlySpendSummary = (
  options?: QueryHook<MonthlySpendSummaryDto>,
) => {
  return useQuery(monthlySpendSummaryQuery(options));
};
