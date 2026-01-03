import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MutationHook } from "@/shared/lib/react-query";
import { UserJSON } from "@clerk/nextjs/server";
import { updateUserPublicMetadataAction } from "./actions";
import { analyticsQueryKeys } from "../../analytics/api/hooks";
import { useUser } from "@clerk/nextjs";

export const useUpdateUserPublicMetadata = ({
  options,
}: MutationHook<UserJSON | null, Partial<UserPublicMetadata>> = {}) => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: (params) => {
      return updateUserPublicMetadataAction(params);
    },
    async onSuccess(userData) {
      const promises: Promise<unknown>[] = [];

      if (user) {
        promises.push(user.reload());
      }

      if (userData) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: analyticsQueryKeys.user(userData.id)._ctx.dashboard
              .queryKey,
          }),
        );
      }

      return await Promise.all(promises);
    },
    ...options,
  });
};
