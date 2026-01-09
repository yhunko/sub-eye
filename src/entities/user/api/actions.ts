"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export const updateUserPublicMetadataAction = async (
  publicMetadata: UserPublicMetadata,
) => {
  const { userId } = await auth();
  const client = await clerkClient();

  if (!userId)
    throw new Error(
      "User ID is not defined. Please make sure you are logged in.",
    );

  if (publicMetadata.locale) {
    (await cookies()).set("NEXT_LOCALE", publicMetadata.locale);
  }

  const user = await client.users.updateUserMetadata(userId, {
    publicMetadata,
  });

  return user.raw;
};
