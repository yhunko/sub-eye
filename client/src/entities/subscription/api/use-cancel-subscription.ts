import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { SubscriptionDto } from "@shared/domains/subscription";
import { apiClient } from "@/shared/api/client";
import { subscriptionsQueryKeys } from "../model/query-keys";
import { analyticsQueryKeys } from "../../analytics";
import { billingQueryKeys } from "@/entities/billing";

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
        queryClient.setQueryData(
          subscriptionsQueryKeys.detail({ userId, subscriptionId: id })
            .queryKey,
          data,
        );
      }

      await Promise.all([
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
    },
  });
};
