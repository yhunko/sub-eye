import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CategoryDto, UpdateCategoryInput } from "shared";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { categoriesQueryKeys } from "../model/query-keys";
import { track } from "@/shared/lib/analytics";

type UpdateCategoryPayload = { id: string; payload: UpdateCategoryInput };

export const useUpdateCategory = ({
  options,
}: MutationHook<CategoryDto, UpdateCategoryPayload> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await apiClient.api.categories[":id"].$patch({
        param: { id },
        json: payload,
      });
      if (!res.ok) {
        throw new Error("Failed to update category");
      }
      return res.json() as Promise<CategoryDto>;
    },
    onSuccess() {
      track("category_updated");
      void queryClient.invalidateQueries({
        queryKey: categoriesQueryKeys.list._def,
      });
    },
    ...options,
  });
};
