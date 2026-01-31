import { useQuery } from "@tanstack/react-query";
import type { SubscriptionDto } from "shared";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { subscriptionsKeys } from "../model/query-keys";
import { apiClient } from "@/shared/api/client";
import { UseSubscriptionsParams } from "../model/params";

export const useSubscriptions = ({
  params,
  options,
}: QueryHook<SubscriptionDto[], UseSubscriptionsParams>) => {
  const { userId, queryParams = {} } = params;

  return useQuery({
    queryKey: subscriptionsKeys.list({
      userId,
      queryParams,
    }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.subscriptions.$get({
        query: queryParams,
      });
      if (!res.ok) {
        throw new Error("Failed to fetch subscriptions");
      }
      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(params.userId),
  });
};
