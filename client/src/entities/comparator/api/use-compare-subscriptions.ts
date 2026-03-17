import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
} from "shared";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
import { comparatorQueryKeys } from "../model/query-keys";
import { billingQueryKeys } from "@/entities/billing";

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
      assertOk(res);
      return res.json();
    },
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: comparatorQueryKeys.quota._def,
      });
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys._def,
      });
    },
    ...options,
  });
};
