import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AddSubscriptionInput, SubscriptionDto } from "shared";
import { billingQueryKeys } from "@/entities/billing";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { analyticsQueryKeys } from "../../analytics";
import { subscriptionsQueryKeys } from "../model/query-keys";

export const useCreateSubscription = ({
  options,
}: MutationHook<SubscriptionDto, AddSubscriptionInput> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.api.subscriptions.$post({
        json: payload,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess(_data, variables) {
      track("subscription_created", {
        billing_period: variables.period ?? "month",
        currency: variables.currency,
      });
      void queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.list._def,
      });
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
      void queryClient.invalidateQueries({
        queryKey: analyticsQueryKeys._def,
      });
    },
    ...options,
  });
};
