"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { DeleteUserDto } from "../model/user.dtos";
import { SubscriptionController } from "../../subscription/lib/subscription.controller";

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

export async function deleteAccountAction(): Promise<DeleteUserDto> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized");
  }

  const controller = new SubscriptionController(userId);
  const deletedSubscriptions = await controller.deleteAllForCurrentUser();

  const client = await clerkClient();
  await client.users.deleteUser(userId);

  return { deletedSubscriptions, userDeleted: true };
}
