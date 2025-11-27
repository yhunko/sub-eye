"use server";

import { db, subscriptionsTable } from "@/shared/lib/db";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

export const getSubscriptions = async () => {
  const user = await auth();

  if (!user.isAuthenticated) {
    return null; // not signed in
  }

  console.log(user.userId);

  try {
    // Ensure plain data only
    return (
      (await db
        .select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.userId, user.userId))) ?? []
    );
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch subscriptions");
  }
};
