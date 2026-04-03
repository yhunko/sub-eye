import { useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateUserPublicMetadata, UserPreferences } from "shared";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { MutationHook } from "@/shared/lib/react-query/types";
import { analyticsQueryKeys } from "../../analytics";
import { subscriptionsQueryKeys } from "../../subscription";

export const useUpdateUserMetadata = ({
  options,
}: MutationHook<UserPreferences, UpdateUserPublicMetadata> = {}) => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    ...options,
    mutationFn: async (metadata) => {
      const res = await apiClient.api.user["public-metadata"].$patch({
        json: metadata,
      });
      assertOk(res);
      return res.json();
    },
    async onSuccess() {
      await user?.reload();
      await queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys._def,
      });
      await queryClient.invalidateQueries({
        queryKey: analyticsQueryKeys._def,
      });
    },
  });
};
