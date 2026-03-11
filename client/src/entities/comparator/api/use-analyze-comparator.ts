import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AnalyzeComparatorInput,
  AnalyzeComparatorResponseDto,
} from "shared";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { apiClient } from "@/shared/api/client";
import { comparatorQueryKeys } from "../model/query-keys";

export const useAnalyzeComparator = ({
  options,
}: MutationHook<AnalyzeComparatorResponseDto, AnalyzeComparatorInput> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.api.comparator.analyze.$post({
        json: payload,
      });

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: "Failed to generate AI insights" }));
        const message =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Failed to generate AI insights";
        throw new Error(message);
      }

      return res.json();
    },
    onSuccess() {
      void queryClient.invalidateQueries({
        queryKey: comparatorQueryKeys.aiQuota._def,
      });
      void queryClient.invalidateQueries({
        queryKey: ["billing"],
      });
    },
    ...options,
  });
};
