"use server";

import { auth } from "@clerk/nextjs/server";
import { SubscriptionController } from "../lib/subscription.controller";
import { AddSubscriptionParams } from "../model/subscription.params";
import { SubscriptionDto } from "../model/subscription.dtos";
import { SubscriptionSchema } from "@/shared/lib/db/schemas/subscription.schema";

// Each export must be an async function
export async function getSubscriptionsAction(): Promise<SubscriptionDto[]> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }

  const controller = new SubscriptionController(userId);
  return await controller.getSubscriptions();
}

export async function addSubscriptionAction(
  payload: AddSubscriptionParams,
): Promise<SubscriptionSchema> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }

  const controller = new SubscriptionController(userId);
  return await controller.addSubscription(payload);
}
