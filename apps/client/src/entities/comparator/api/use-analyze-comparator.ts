import type {
  AnalyzeComparatorInput,
  AnalyzeComparatorResponseDto,
} from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import { track } from "@/shared/lib/analytics";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { comparatorQueryKeys } from "../model/query-keys";

const resolveFallbackReason = (
  reason: string | null,
): "quota_exceeded" | "provider_unavailable" | "none" => {
  if (reason === "quota_exceeded" || reason === "provider_unavailable") {
    return reason;
  }

  return "none";
};

export const useAnalyzeComparator = ({
  options,
}: MutationHook<AnalyzeComparatorResponseDto, AnalyzeComparatorInput> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      track("comparator_ai_analysis_requested");

      const res = await apiClient.api.comparator.analyze.$post({
        json: payload,
      });
      assertOk(res);
      return res.json();
    },
    onSuccess(data) {
      track("comparator_ai_analysis_completed", {
        mode: data.mode,
        cache_hit: data.cacheHit,
        fallback_reason: resolveFallbackReason(data.fallbackReason),
      });
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
