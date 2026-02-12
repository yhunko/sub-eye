import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { SubscriptionDto } from "@shared/domains/subscription";
import { apiClient } from "@/shared/api/client";
import { subscriptionsQueryKeys } from "../model/query-keys";
import { analyticsQueryKeys } from "../../analytics";

export type CancelSubscriptionParams = {
  id: string;
};

export const useCancelSubscription = ({
  options,
}: MutationHook<SubscriptionDto, CancelSubscriptionParams> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id }) => {
      const res = await apiClient.api.subscriptions[":id"].cancel.$post({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to cancel subscription");
      }
      return res.json();
    },
    onSuccess: async (data, variables) => {
      const { id } = variables;

      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys._def,
        });

        queryClient.setQueryData(
          subscriptionsQueryKeys.detail({ userId, subscriptionId: id })
            .queryKey,
          data,
        );

        queryClient.setQueriesData<SubscriptionDto[]>(
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

            return oldData.map((sub) => (sub.id === id ? data : sub));
          },
        );
      } else {
        await queryClient.invalidateQueries({
          queryKey: subscriptionsQueryKeys.list._def,
        });
      }
    },
  });
};
