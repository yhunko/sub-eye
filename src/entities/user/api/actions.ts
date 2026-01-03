"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export const updateUserPublicMetadataAction = async (
  publicMetadata: UserPublicMetadata,
) => {
  const { userId } = await auth();
  const client = await clerkClient();

  if (!userId)
    throw new Error(
      "User ID is not defined. Please make sure you are logged in.",
    );

  const user = await client.users.updateUserMetadata(userId, {
    publicMetadata: publicMetadata,
  });

  return user.raw;
};
