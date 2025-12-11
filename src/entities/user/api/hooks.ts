import { useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";
import { MutationHook, QueryHook } from "@/shared/lib/react-query";
import { UserPublicMetadata } from "../model/user.model";
import { UserJSON } from "@clerk/nextjs/server";
import { updateUserPublicMetadataAction } from "./actions";
import { useUser } from "@clerk/nextjs";
import { createQueryKeys } from "@lukemorales/query-key-factory";

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
  const { user } = useUser();

  return useMutation({
    mutationFn: (params) => {
      return updateUserPublicMetadataAction(params);
    },
    async onSuccess() {
      await user?.reload();
    },
    ...options,
  });
};
