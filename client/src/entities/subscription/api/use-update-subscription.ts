import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import type {
  UpdateSubscriptionInput,
  SubscriptionDto,
} from "@shared/domains/subscription";
import { apiClient } from "@/shared/api/client";
import { subscriptionsQueryKeys } from "../model/query-keys";

export type UpdateSubscriptionParams = {
  id: string;
  payload: UpdateSubscriptionInput;
};

export const useUpdateSubscription = ({
  options,
}: MutationHook<SubscriptionDto, UpdateSubscriptionParams> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id, payload }) => {
      const res = await apiClient.api.subscriptions[":id"].$patch({
        param: { id },
        json: payload,
      });
      if (!res.ok) {
        throw new Error("Failed to update subscription");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      const { id } = variables;

      if (userId) {
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
      }
      // options?.onSuccess?.(data, variables, context);
    },
  });
};
