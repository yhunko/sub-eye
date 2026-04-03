import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CategoryDto, UpdateCategoryInput } from "shared";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { categoriesQueryKeys } from "../model/query-keys";

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
      assertOk(res);
      return res.json();
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
