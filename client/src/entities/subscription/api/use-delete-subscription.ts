import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MutationHook } from "@/shared/lib/react-query/types";
import { IdParam } from "@shared/domains/subscription";
import { apiClient } from "@/shared/api/client";
import { ApiVoidReturn } from "@shared/types";
import { subscriptionsKeys } from "../model/query-keys";

export const useDeleteSubscription = ({
  options,
}: MutationHook<ApiVoidReturn, IdParam> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (param) => {
      const res = await apiClient.api.subscriptions[":id"].$delete({ param });
      if (!res.ok) {
        throw new Error("Failed to fetch subscriptions");
      }
      return res.json();
    },
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: subscriptionsKeys.list._def,
      });
    },
  });
};
