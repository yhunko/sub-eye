import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
} from "shared";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { apiClient } from "@/shared/api/client";
import { comparatorQueryKeys } from "../model/query-keys";

export const useCompareSubscriptions = ({
  options,
}: MutationHook<
  CompareSubscriptionsResponseDto,
  CompareSubscriptionsInput
> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.api.comparator.compare.$post({
        json: payload,
      });

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: "Failed to compare subscriptions" }));
        const message =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Failed to compare subscriptions";
        throw new Error(message);
      }

      return res.json();
    },
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: comparatorQueryKeys.quota._def,
      });
      void queryClient.invalidateQueries({
        queryKey: ["billing"],
      });
    },
    ...options,
  });
};
