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

export async function getSubscriptionsAction(
  params?: GetSubscriptionsParams,
): Promise<SubscriptionDto[]> {
  return Sentry.withServerActionInstrumentation(
    "getSubscriptionsAction",
    {
      recordResponse: true,
    },
    async () => {
      const { isAuthenticated, userId } = await auth();

      if (!isAuthenticated || !userId) {
        throw new Error(
          "Unauthorized: User must be logged in to fetch subscriptions",
        );
      }

      Sentry.setUser({ id: userId });

      const controller = new SubscriptionController(userId);
      return await controller.getSubscriptions(params);
    },
  );
}

export async function addSubscriptionAction(
  payload: AddSubscriptionParams,
): Promise<SubscriptionSchema> {
  return Sentry.withServerActionInstrumentation(
    "addSubscriptionAction",
    {
      recordResponse: true,
    },
    async () => {
      const { isAuthenticated, userId } = await auth();

      if (!isAuthenticated || !userId) {
        throw new Error(
          "Unauthorized: User must be logged in to add a subscription",
        );
      }

      Sentry.setUser({ id: userId });

      const controller = new SubscriptionController(userId);
      return await controller.addSubscription(payload);
    },
  );
}

export async function deleteSubscriptionAction(id: string): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    "deleteSubscriptionAction",
    {
      recordResponse: true,
    },
    async () => {
      const { isAuthenticated, userId } = await auth();

      if (!isAuthenticated || !userId) {
        throw new Error(
          "Unauthorized: User must be logged in to delete a subscription",
        );
      }

      Sentry.setUser({ id: userId });
      Sentry.setTag("subscription_id", id);

      const controller = new SubscriptionController(userId);
      return await controller.deleteSubscription(id);
    },
  );
}
