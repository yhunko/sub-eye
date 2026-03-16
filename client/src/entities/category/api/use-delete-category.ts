import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { categoriesQueryKeys } from "../model/query-keys";
import { billingQueryKeys } from "@/entities/billing";
import { subscriptionsQueryKeys } from "@/entities/subscription";
import { track } from "@/shared/lib/analytics";

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
      void queryClient.invalidateQueries({
        queryKey: categoriesQueryKeys.list._def,
      });
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
      void queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.list._def,
      });
    },
    ...options,
  });
};
