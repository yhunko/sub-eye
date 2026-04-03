import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { invalidateAfterCategoryDelete } from "./invalidate-after-category-delete";

export const useDeleteCategory = ({
  options,
}: MutationHook<void, string> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await apiClient.api.categories[":id"].$delete({
        param: { id },
      });
    },
    onSuccess() {
      track("category_deleted");
      void invalidateAfterCategoryDelete(queryClient);
    },
    ...options,
  });
};
