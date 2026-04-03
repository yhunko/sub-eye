import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
} from "shared";
import { billingQueryKeys } from "@/entities/billing";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
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
