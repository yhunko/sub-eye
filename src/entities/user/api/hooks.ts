import {
  useMutation,
  useQuery,
  keepPreviousData,
  useQueryClient,
} from "@tanstack/react-query";
import { MutationHook, QueryHook } from "@/shared/lib/react-query";
import { UserPublicMetadata } from "../model/user.model";
import { UserJSON } from "@clerk/nextjs/server";
import { updateUserPublicMetadataAction, deleteAccountAction } from "./actions";
import { useUser } from "@clerk/nextjs";
import { createQueryKeys } from "@lukemorales/query-key-factory";
import { DeleteUserDto } from "../model/user.dtos";

export const userQueryKeys = createQueryKeys("USER", {
  publicMetadata: null,
});

export const useUserPublicMetadata = ({
  options,
}: QueryHook<UserPublicMetadata> = {}) => {
  const { user, isLoaded } = useUser();

  return useQuery({
    queryKey: userQueryKeys.publicMetadata.queryKey,
    queryFn: async () => {
      return user!.publicMetadata;
    },
    enabled: isLoaded && !!user,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
};

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
        queryClient.setQueryData(
          userQueryKeys.publicMetadata.queryKey,
          user?.public_metadata,
        );
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
