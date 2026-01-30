import { useMutation } from "@tanstack/react-query";
import { MutationHook } from "@/shared/lib/react-query/types";
import type {
  UpdateSubscriptionInput,
  SubscriptionDto,
} from "@shared/domains/subscription";
import { apiClient } from "@/shared/api/client";

export type UpdateSubscriptionParams = {
  id: string;
  payload: UpdateSubscriptionInput;
};

export const useUpdateSubscription = ({
  options,
}: MutationHook<SubscriptionDto, UpdateSubscriptionParams> = {}) => {
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
  });
};
