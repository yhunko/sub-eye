import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { SchedulePriceChangeInput, SubscriptionDto } from "shared";
import { apiClient } from "@/shared/api/client";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

export type ScheduleSubscriptionPriceChangeParams = {
  id: string;
  payload: SchedulePriceChangeInput;
};

export const useScheduleSubscriptionPriceChange = ({
  options,
}: MutationHook<
  SubscriptionDto,
  ScheduleSubscriptionPriceChangeParams
> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id, payload }) => {
      const res = await apiClient.api.subscriptions[":id"][
        "price-change"
      ].schedule.$post({
        param: { id },
        json: payload,
      });

      if (!res.ok) {
        throw new Error("Failed to schedule price change");
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
