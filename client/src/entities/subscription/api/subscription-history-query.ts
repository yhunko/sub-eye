import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import type { SubscriptionHistoryDto } from "shared";
import { subscriptionsQueryKeys } from "../model/query-keys";

type SubscriptionHistoryQueryParams = {
  id: string;
  userId: string;
};

export type SubscriptionHistoryResponse = {
  history: SubscriptionHistoryDto[];
  hasMore: boolean;
};

export const subscriptionHistoryQuery = ({
  params,
  options,
}: QueryHook<SubscriptionHistoryResponse, SubscriptionHistoryQueryParams>) =>
  queryOptions({
    ...options,
    queryKey: subscriptionsQueryKeys.history({
      userId: params.userId,
      subscriptionId: params.id,
    }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.subscriptions[":id"].history.$get({
        param: { id: params.id },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch subscription history");
      }

      return (await res.json()) as SubscriptionHistoryResponse;
    },
    enabled: Boolean(params.id && params.userId) && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 30_000,
    gcTime: options?.gcTime ?? 5 * 60_000,
  });
