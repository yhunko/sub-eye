import { queryOptions } from "@tanstack/react-query";
import { subscriptionsQueryKeys } from "../model/query-keys";
import { apiClient } from "../../../shared/api/client";
import type { QueryHook } from "../../../shared/lib/react-query/types";
import type { SubscriptionDto } from "shared";
import { UseSubscriptionsParams } from "../model/params";

export const subscriptionsQuery = ({
  params,
  options,
}: QueryHook<SubscriptionDto[], UseSubscriptionsParams>) => {
  const { userId, queryParams = {} } = params;

  return queryOptions({
    queryKey: subscriptionsQueryKeys.list({
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
