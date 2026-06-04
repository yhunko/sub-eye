import { useAuth } from "@clerk/clerk-react";
import type { SchedulePriceChangeInput, SubscriptionDto } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
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
      assertOk(res);
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      track("price_change_scheduled", {
        effective_date_mode:
          variables.payload.mode === "nextOccurrence"
            ? "next_occurrence"
            : "custom",
      });
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
  });
};
