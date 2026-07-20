import { useAuth } from "@clerk/clerk-react";
import type { SubscriptionDto } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

export type ApplyPhaseNowParams = {
  id: string;
  phaseId: string;
};

export const useApplyPhaseNow = ({
  options,
}: MutationHook<SubscriptionDto, ApplyPhaseNowParams> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id, phaseId }) => {
      const res = await apiClient.api.subscriptions[":id"].phases[":phaseId"][
        "apply-now"
      ].$post({
        param: { id, phaseId },
      });
      assertOk(res);
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      track("price_change_applied_now");
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
  });
};
