import { queryOptions } from "@tanstack/react-query";
import { subscriptionsQueryKeys } from "../model/query-keys";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import type { SubscriptionDto } from "@shared/domains/subscription";

type UseSubscriptionParams = {
  id: string;
  userId: string;
};

export const subscriptionQuery = ({
  params,
  options,
}: QueryHook<SubscriptionDto, UseSubscriptionParams>) =>
  queryOptions({
    ...options,
    queryKey: subscriptionsQueryKeys.detail({
      userId: params.userId,
      subscriptionId: params.id,
    }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.subscriptions[":id"].$get({
        param: { id: params.id },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch subscription");
      }
      return res.json();
    },
    enabled: Boolean(params.userId && params.id),
  });
