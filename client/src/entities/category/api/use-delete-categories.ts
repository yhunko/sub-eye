import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteCategoriesInput, DeleteCategoriesResponse } from "shared";
import { apiClient } from "@/shared/api/client";
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
      if (!res.ok) {
        throw new Error("Failed to delete categories");
      }
      return res.json() as Promise<DeleteCategoriesResponse>;
    },
    onSuccess() {
      track("category_deleted");
      void invalidateAfterCategoryDelete(queryClient);
    },
    ...options,
  });
};
