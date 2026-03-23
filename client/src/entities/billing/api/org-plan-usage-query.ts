import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import type { QueryHook } from "@/shared/lib/react-query/types";
import type { PlanUsage } from "shared";
import { billingQueryKeys } from "../model/query-keys";

export type OrgPlanUsageParams = { orgId: string };

export const orgPlanUsageQuery = ({
  params,
  options,
}: QueryHook<PlanUsage, OrgPlanUsageParams>) => {
  const { orgId } = params;

  return queryOptions({
    queryKey: billingQueryKeys.orgUsage({ orgId }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.billing.org.usage.$get();
      assertOk(res);
      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(orgId),
  });
};
