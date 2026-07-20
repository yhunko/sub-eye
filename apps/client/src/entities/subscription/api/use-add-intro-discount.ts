import { useAuth } from "@clerk/clerk-react";
import type { AddIntroDiscountInput, SubscriptionDto } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

export type AddIntroDiscountParams = {
  id: string;
  payload: AddIntroDiscountInput;
};

export const useAddIntroDiscount = ({
  options,
}: MutationHook<SubscriptionDto, AddIntroDiscountParams> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id, payload }) => {
      const res = await apiClient.api.subscriptions[":id"][
        "intro-discount"
      ].$post({
        param: { id },
        json: payload,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      track("intro_discount_added");
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
  });
};
