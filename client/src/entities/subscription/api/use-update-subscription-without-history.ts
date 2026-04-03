import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubscriptionDto, UpdateSubscriptionInput } from "shared";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

export type UpdateSubscriptionWithoutHistoryParams = {
  id: string;
  payload: UpdateSubscriptionInput;
};

export const useUpdateSubscriptionWithoutHistory = ({
  options,
}: MutationHook<
  SubscriptionDto,
  UpdateSubscriptionWithoutHistoryParams
> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await apiClient.api.subscriptions[":id"].$patch({
        param: { id },
        query: {
          trackHistory: "false",
        },
        json: payload,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
    ...options,
  });
};
