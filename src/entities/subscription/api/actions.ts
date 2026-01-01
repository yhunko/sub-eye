"use server";

import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { SubscriptionController } from "../lib/subscription.controller";
import {
  AddSubscriptionParams,
  GetSubscriptionsParams,
} from "../model/subscription.params";
import { SubscriptionDto } from "../model/subscription.dtos";
import { SubscriptionSchema } from "@/shared/lib/db/schemas/subscription.schema";

// Each export must be an async function
export async function getSubscriptionsAction(
  params?: GetSubscriptionsParams,
): Promise<SubscriptionDto[]> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }

  const controller = new SubscriptionController(userId);
  return await controller.getSubscriptions(params);
}

export async function addSubscriptionAction(
  payload: AddSubscriptionParams,
): Promise<SubscriptionSchema> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }

  try {
    const controller = new SubscriptionController(userId);
    return await controller.addSubscription(payload);
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setUser({ id: userId });
      scope.setTag("action", "addSubscriptionAction");
      scope.setExtra("payload", payload);

      Sentry.captureException(error);
    });
    throw error;
  }
}

export async function deleteSubscriptionAction(id: number): Promise<void> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }

  const controller = new SubscriptionController(userId);
  return await controller.deleteSubscription(id);
}
