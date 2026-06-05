import { useAuth } from "@clerk/clerk-react";
import type { SubscriptionDto } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

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
