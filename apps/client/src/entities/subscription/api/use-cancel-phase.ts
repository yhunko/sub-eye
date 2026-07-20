import { useAuth } from "@clerk/clerk-react";
import type { SubscriptionDto } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

export type CancelPhaseParams = {
  id: string;
  phaseId: string;
};

export const useCancelPhase = ({
  options,
}: MutationHook<SubscriptionDto, CancelPhaseParams> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id, phaseId }) => {
      const res = await apiClient.api.subscriptions[":id"].phases[
        ":phaseId"
      ].$delete({
        param: { id, phaseId },
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
