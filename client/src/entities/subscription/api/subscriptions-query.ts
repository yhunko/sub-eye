import { queryOptions } from "@tanstack/react-query";
import { subscriptionsQueryKeys } from "../model/query-keys";
import { apiClient } from "../../../shared/api/client";
import { assertOk } from "../../../shared/api/api-error";
import type { QueryHook } from "../../../shared/lib/react-query/types";
import type { SubscriptionDto } from "shared";
import { UseSubscriptionsParams } from "../model/params";

export const subscriptionsQuery = ({
  params,
  options,
}: QueryHook<SubscriptionDto[], UseSubscriptionsParams>) => {
  const { userId, orgId, queryParams = {} } = params;

  return queryOptions({
    queryKey: subscriptionsQueryKeys.list({
      userId,
      orgId,
      queryParams,
    }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.subscriptions.$get({
        query: queryParams,
      });
      assertOk(res);
      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(params.userId),
  });
};
