import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { BulkDeleteSubscriptionsInput, BulkDeleteResponse } from "shared";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import { subscriptionsQueryKeys } from "../model/query-keys";
import { billingQueryKeys } from "@/entities/billing";
import { analyticsQueryKeys } from "@/entities/analytics";
import { track } from "@/shared/lib/analytics";

export const useBulkDeleteSubscriptions = ({
  options,
}: MutationHook<BulkDeleteResponse, BulkDeleteSubscriptionsInput> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async (input) => {
      const res = await apiClient.api.subscriptions["batch"]["delete"].$post({
        json: input,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      track("subscription_deleted");

      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys._def,
        });

        queryClient.setQueriesData<import("shared").SubscriptionDto[]>(
          {
            queryKey: subscriptionsQueryKeys
              .list({
                userId,
                queryParams: {},
              })
              .queryKey.slice(0, 3),
          },
          (oldData) => {
            if (!oldData) return oldData;

            const idsToDelete = new Set(variables.ids);
            return oldData.filter((sub) => !idsToDelete.has(sub.id));
          },
        );
      }
    },
    async onSettled() {
      await queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.list._def,
      });
      await queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
    },
  });
};
