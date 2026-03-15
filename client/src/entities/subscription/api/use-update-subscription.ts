import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { UpdateSubscriptionInput, SubscriptionDto } from "shared";
import { apiClient } from "@/shared/api/client";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";
import { track } from "@/shared/lib/analytics";

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
        query: {},
        json: payload,
      });
      if (!res.ok) {
        throw new Error("Failed to update subscription");
      }
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      track("subscription_updated");
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
  });
};
