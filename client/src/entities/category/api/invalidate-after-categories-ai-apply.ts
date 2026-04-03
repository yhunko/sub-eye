import type { QueryClient } from "@tanstack/react-query";
import { analyticsQueryKeys } from "@/entities/analytics/model/query-keys";
import { billingQueryKeys } from "@/entities/billing/model/query-keys";
import { subscriptionsQueryKeys } from "@/entities/subscription/model/query-keys";
import { categoriesQueryKeys } from "../model/query-keys";

type Invalidator = Pick<QueryClient, "invalidateQueries">;

export const invalidateAfterCategoriesAiApply = async (
  queryClient: Invalidator,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: categoriesQueryKeys.list._def,
    }),
    queryClient.invalidateQueries({
      queryKey: subscriptionsQueryKeys.list._def,
    }),
    queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys._def,
    }),
    queryClient.invalidateQueries({
      queryKey: billingQueryKeys.usage._def,
    }),
  ]);
};
