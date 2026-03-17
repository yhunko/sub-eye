import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteCategoriesInput, DeleteCategoriesResponse } from "shared";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { track } from "@/shared/lib/analytics";
import { invalidateAfterCategoryDelete } from "./invalidate-after-category-delete";

export const useDeleteCategories = ({
  options,
}: MutationHook<DeleteCategoriesResponse, DeleteCategoriesInput> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.api.categories.batch.delete.$post({
        json: payload,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess() {
      track("category_deleted");
      void invalidateAfterCategoryDelete(queryClient);
    },
    ...options,
  });
};
