import { useAuth } from "@clerk/clerk-react";
import type { StartTrialInput, SubscriptionDto } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";

export type StartTrialParams = {
  id: string;
  payload: StartTrialInput;
};

export const useStartTrial = ({
  options,
}: MutationHook<SubscriptionDto, StartTrialParams> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async ({ id, payload }) => {
      const res = await apiClient.api.subscriptions[":id"].trial.$post({
        param: { id },
        json: payload,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      track("trial_started");
      await handleSubscriptionMutationSuccess({
        queryClient,
        userId,
        subscriptionId: variables.id,
      });
    },
  });
};
