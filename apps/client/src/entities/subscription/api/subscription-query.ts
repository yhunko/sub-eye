import type { SubscriptionDto } from "@subeye/shared";
import { queryOptions } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { subscriptionsQueryKeys } from "../model/query-keys";

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
      assertOk(res);
      return res.json();
    },
    enabled: Boolean(params.userId && params.id),
  });
