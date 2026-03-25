import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { MutationHook } from "@/shared/lib/react-query/types";
import type {
  BulkUpdateCategoryInput,
  BulkUpdateCategoryResponse,
} from "shared";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import { handleSubscriptionMutationSuccess } from "../lib/handle-subscription-mutation-success";
import { track } from "@/shared/lib/analytics";

export const useBulkUpdateCategory = ({
  options,
}: MutationHook<BulkUpdateCategoryResponse, BulkUpdateCategoryInput> = {}) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    ...options,
    mutationFn: async (input) => {
      const res = await apiClient.api.subscriptions["batch"]["category"].$post({
        json: input,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess: async (_data, variables) => {
      track("subscription_updated");

      if (userId) {
        await Promise.all(
          variables.ids.map((subscriptionId) =>
            handleSubscriptionMutationSuccess({
              queryClient,
              userId,
              subscriptionId,
            }),
          ),
        );
      }
    },
  });
};
