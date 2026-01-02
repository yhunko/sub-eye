import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MutationHook } from "@/shared/lib/react-query";
import { UserJSON } from "@clerk/nextjs/server";
import { updateUserPublicMetadataAction, deleteAccountAction } from "./actions";
import { DeleteUserDto } from "../model/user.dtos";
import { analyticsQueryKeys } from "../../analytics/api/hooks";

export const useUpdateUserPublicMetadata = ({
  options,
}: MutationHook<UserJSON | null, Partial<UserPublicMetadata>> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => {
      return updateUserPublicMetadataAction(params);
    },
    async onSuccess(user) {
      if (user) {
        return await queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.user(user.id)._ctx.dashboard.queryKey,
        });
      }
    },
    ...options,
  });
};

export const useDeleteAccount = ({
  options,
}: MutationHook<DeleteUserDto, unknown> = {}) => {
  return useMutation({
    mutationFn: () => deleteAccountAction(),
    ...options,
  });
};
