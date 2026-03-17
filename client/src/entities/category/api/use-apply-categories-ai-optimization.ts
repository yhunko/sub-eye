import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import type { MutationHook } from "@/shared/lib/react-query/types";
import type {
  CategoryAiOptimizeApplyInput,
  CategoryAiOptimizeApplyResponse,
} from "shared";
import { invalidateAfterCategoriesAiApply } from "./invalidate-after-categories-ai-apply";

export const useApplyCategoriesAiOptimization = ({
  options,
}: MutationHook<
  CategoryAiOptimizeApplyResponse,
  CategoryAiOptimizeApplyInput
> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.api.categories.ai.optimize.apply.$post({
        json: payload,
      });
      assertOk(response);
      return response.json();
    },
    onSuccess() {
      void invalidateAfterCategoriesAiApply(queryClient);
    },
    ...options,
  });
};
