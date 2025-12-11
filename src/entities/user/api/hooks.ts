import { useMutation } from "@tanstack/react-query";
import { MutationHook } from "@/shared/lib/react-query";
import { UserPublicMetadata } from "../model/user.model";
import { UserJSON } from "@clerk/nextjs/server";
import { updateUserPublicMetadataAction } from "./actions";
import { useUser } from "@clerk/nextjs";

export const useUpdateUserPublicMetadata = ({
  options,
}: MutationHook<UserJSON | null, Partial<UserPublicMetadata>> = {}) => {
  const { user } = useUser();

  return useMutation({
    ...options,
    mutationFn: (params) => {
      return updateUserPublicMetadataAction(params);
    },
    async onSuccess() {
      await user?.reload();
    },
  });
};
