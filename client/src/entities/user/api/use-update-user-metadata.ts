import { useMutation } from "@tanstack/react-query";
import { MutationHook } from "@/shared/lib/react-query/types";
import type { UserPreferences } from "@shared/types";
import type { UpdateUserPublicMetadata } from "@shared/schemas/userSchemas";
import { apiClient } from "@/shared/api/client";

export const useUpdateUserMetadata = ({
  options,
}: MutationHook<UserPreferences, UpdateUserPublicMetadata> = {}) => {
  return useMutation({
    ...options,
    mutationFn: async (metadata) => {
      const res = await apiClient.api.user["public-metadata"].$patch({
        json: metadata,
      });
      if (!res.ok) {
        throw new Error("Failed to update user metadata");
      }
      return res.json();
    },
  });
};
