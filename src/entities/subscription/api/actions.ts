"use server";

import { subscriptionsTable } from "@/shared/lib/db";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/shared/lib/db/client";
import { AddSubscriptionParams } from "./params";

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

export const addSubscription = async (payload: AddSubscriptionParams) => {
  const user = await auth();

  if (!user.isAuthenticated) {
    return null; // not signed in
  }

  try {
    return db
      .insert(subscriptionsTable)
      .values({
        ...payload,
        userId: user.userId,
      })
      .returning();
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch subscriptions");
  }
};
