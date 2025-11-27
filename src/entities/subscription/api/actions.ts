"use server";

import { subscriptionsTable, AddSubscriptionDto } from "@/shared/lib/db";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/shared/lib/db/client";

export const getSubscriptions = async () => {
  const user = await auth();

  if (!user.isAuthenticated) {
    return null; // not signed in
  }

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

export const addSubscription = async (payload: AddSubscriptionDto) => {
  const user = await auth();

  if (!user.isAuthenticated) {
    return null; // not signed in
  }

  try {
    return db.insert(subscriptionsTable).values(payload).returning();
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch subscriptions");
  }
};
