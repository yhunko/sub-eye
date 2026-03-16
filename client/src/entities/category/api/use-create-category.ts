import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CategoryDto, CreateCategoryInput } from "shared";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { categoriesQueryKeys } from "../model/query-keys";
import { billingQueryKeys } from "@/entities/billing";
import { track } from "@/shared/lib/analytics";

type CreateCategoryOptions = MutationHook<CategoryDto, CreateCategoryInput> & {
  source?: "settings" | "subscription_form";
};

export const useCreateCategory = ({
  options,
  source = "settings",
}: CreateCategoryOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.api.categories.$post({ json: payload });
      if (!res.ok) {
        throw new Error("Failed to create category");
      }
      return res.json() as Promise<CategoryDto>;
    },
    onSuccess() {
      track("category_created", { source });
      void queryClient.invalidateQueries({
        queryKey: categoriesQueryKeys.list._def,
      });
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
    },
    ...options,
  });
};
