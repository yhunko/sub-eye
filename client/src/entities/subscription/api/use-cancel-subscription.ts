import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { SubscriptionDto } from "shared";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";
import { track } from "@/shared/lib/analytics";

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
      assertOk(res);
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      track("subscription_canceled");
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
  });
};
