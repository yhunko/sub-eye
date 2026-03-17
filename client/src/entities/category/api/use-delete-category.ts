import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { track } from "@/shared/lib/analytics";
import { invalidateAfterCategoryDelete } from "./invalidate-after-category-delete";

export const useDeleteCategory = ({
  options,
}: MutationHook<void, string> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.api.categories[":id"].$delete({
        param: { id },
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete category");
      }
    },
    onSuccess() {
      track("category_deleted");
      void invalidateAfterCategoryDelete(queryClient);
    },
    ...options,
  });
};
