import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CategoryDto, CreateCategoryInput } from "shared";
import { billingQueryKeys } from "@/entities/billing";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { categoriesQueryKeys } from "../model/query-keys";

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
      assertOk(res);
      return res.json();
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
