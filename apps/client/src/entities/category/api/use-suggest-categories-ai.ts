import type { CategoryAiSuggestResponse } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingQueryKeys } from "@/entities/billing";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";

export const useSuggestCategoriesAi = ({
  options,
}: MutationHook<CategoryAiSuggestResponse, void> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.categories.ai.suggest.$post();
      assertOk(response);
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
