import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { extractApiErrorMessage } from "@/shared/lib/react-query/extract-api-error";
import type { CategoryAiApplyInput, CategoryAiApplyResponse } from "shared";
import { invalidateAfterCategoriesAiApply } from "./invalidate-after-categories-ai-apply";

export const useApplyCategoriesAi = ({
  options,
}: MutationHook<CategoryAiApplyResponse, CategoryAiApplyInput> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.api.categories.ai.apply.$post({
        json: payload,
      });
      if (!response.ok) {
        throw new Error(
          await extractApiErrorMessage(
            response,
            "Failed to apply generated categories",
          ),
        );
      }

      return response.json();
    },
    onSuccess() {
      void invalidateAfterCategoriesAiApply(queryClient);
    },
    ...options,
  });
};
