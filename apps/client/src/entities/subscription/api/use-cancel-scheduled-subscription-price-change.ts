import { useAuth } from "@clerk/clerk-react";
import type { SubscriptionDto } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

export type CancelScheduledSubscriptionPriceChangeParams = {
  id: string;
};

export const useCancelScheduledSubscriptionPriceChange = ({
  options,
}: MutationHook<
  SubscriptionDto,
  CancelScheduledSubscriptionPriceChangeParams
> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id }) => {
      const res = await apiClient.api.subscriptions[":id"][
        "price-change"
      ].schedule.$delete({
        param: { id },
      });
      assertOk(res);
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      track("price_change_canceled");
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
  });
};
