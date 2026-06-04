import type {
  CategoryAiApplyInput,
  CategoryAiApplyResponse,
} from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
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
      assertOk(response);
      return response.json();
    },
    onSuccess() {
      void invalidateAfterCategoriesAiApply(queryClient);
    },
    ...options,
  });
};
