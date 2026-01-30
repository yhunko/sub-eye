import { useQuery } from "@tanstack/react-query";
import type { SubscriptionDto } from "shared";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { subscriptionsKeys } from "../model/query-keys";
import { GetSubscriptionsParams } from "@shared/domains/subscription";
import { apiClient } from "@/shared/api/client";

type UseSubscriptionsParams = { userId: string } & GetSubscriptionsParams;

export const useSubscriptions = ({
  params,
  options,
}: QueryHook<SubscriptionDto[], UseSubscriptionsParams>) => {
  return useQuery({
    queryKey: subscriptionsKeys.list({
      userId: params.userId,
      params,
    }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.subscriptions.$get({
        query: params,
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
