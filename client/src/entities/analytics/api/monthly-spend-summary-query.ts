import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import type { QueryHook } from "@/shared/lib/react-query/types";
import type { MonthlySpendSummaryDto } from "shared";
import { analyticsQueryKeys } from "../model/query-keys";

export const monthlySpendSummaryQuery = (
  options?: QueryHook<MonthlySpendSummaryDto>,
) => ({
  queryKey: analyticsQueryKeys.monthlySpend.queryKey,
  queryFn: async () => {
    const res = await apiClient.api.analytics["monthly-summary"].$get();
    assertOk(res);
    return res.json();
  },
  ...options,
});
