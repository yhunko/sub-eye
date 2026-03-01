import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { SubscriptionDto } from "shared";
import { apiClient } from "@/shared/api/client";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

export type ApplyScheduledSubscriptionPriceChangeNowParams = {
  id: string;
};

export const useApplyScheduledSubscriptionPriceChangeNow = ({
  options,
}: MutationHook<
  SubscriptionDto,
  ApplyScheduledSubscriptionPriceChangeNowParams
> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id }) => {
      const res = await apiClient.api.subscriptions[":id"]["price-change"][
        "apply-now"
      ].$post({
        param: { id },
      });

      if (!res.ok) {
        throw new Error("Failed to apply scheduled price change");
      }

      return res.json();
    },
    onSuccess: async (_data, variables) => {
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
  });
};
