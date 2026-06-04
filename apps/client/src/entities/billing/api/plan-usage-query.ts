import type { PlanUsage } from "@subeye/shared";
import { queryOptions } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { billingQueryKeys } from "../model/query-keys";

export type PlanUsageParams = { userId: string };

export const planUsageQuery = ({
  params,
  options,
}: QueryHook<PlanUsage, PlanUsageParams>) => {
  const { userId } = params;

  return queryOptions({
    queryKey: billingQueryKeys.usage({ userId }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.billing.usage.$get();
      assertOk(res);
      const usage = await res.json();

      if (!import.meta.env.DEV) {
        return usage;
      }

      const { applyPlanUsageOverride, readLocalPlanOverride } = await import(
        "@/shared/lib/billing/local-plan-override"
      );

      return applyPlanUsageOverride(usage, readLocalPlanOverride());
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
};
