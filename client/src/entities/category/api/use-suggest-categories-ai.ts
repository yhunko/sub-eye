import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { extractApiErrorMessage } from "@/shared/lib/react-query/extract-api-error";
import type { CategoryAiSuggestResponse } from "shared";
import { billingQueryKeys } from "@/entities/billing";

export const useSuggestCategoriesAi = ({
  options,
}: MutationHook<CategoryAiSuggestResponse, void> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.categories.ai.suggest.$post();
      if (!response.ok) {
        throw new Error(
          await extractApiErrorMessage(
            response,
            "Failed to generate categories",
          ),
        );
      }

      return response.json();
    },
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
    },
    ...options,
  });
};
