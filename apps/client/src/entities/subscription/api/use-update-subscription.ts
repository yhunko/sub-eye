import { useAuth } from "@clerk/clerk-react";
import type { SubscriptionDto, UpdateSubscriptionInput } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

export type UpdateSubscriptionParams = {
  id: string;
  payload: UpdateSubscriptionInput;
  trackHistory?: boolean;
};

export const useUpdateSubscription = ({
  options,
}: MutationHook<SubscriptionDto, UpdateSubscriptionParams> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id, payload, trackHistory }) => {
      const res = await apiClient.api.subscriptions[":id"].$patch({
        param: { id },
        query: trackHistory === false ? { trackHistory: "false" } : {},
        json: payload,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      if (variables.trackHistory !== false) {
        track("subscription_updated");
      }
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
  });
};
