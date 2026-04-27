import { Client, type WorkflowContext } from "@upstash/workflow";
import { serve } from "@upstash/workflow/hono";
import { subDays } from "date-fns";
import { DateTimezoneUtils, hasPlanFeature } from "shared";
import { db } from "../../db";
import { PushNotificationContent } from "../push-notification/pushNotificationContent";
import { PushNotificationService } from "../push-notification/pushNotificationService";
import { UserService } from "../user/userService";
import { SubscriptionRepository } from "./subscriptionRepository";

export type SubscriptionCancellationWorkflowPayload = {
  subscriptionId: string;
  cancellationDate: string;
};

export class SubscriptionCancellationWorkflow {
  static handler = serve<SubscriptionCancellationWorkflowPayload>(
    async (
      context: WorkflowContext<SubscriptionCancellationWorkflowPayload>,
    ) => {
      const { subscriptionId, cancellationDate } = context.requestPayload;
      const subscription = await SubscriptionRepository.findById(
        db,
        subscriptionId,
      );

      if (!subscription) {
        return;
      }

      const preferences = await UserService.getUserPreferences(
        subscription.userId,
      );
      const planId = await UserService.getPlanId(subscription.userId);

      if (!hasPlanFeature(planId, "expiryNotifications")) {
        return;
      }
      if (!preferences.expiryNotificationsEnabled) {
        return;
      }

      const intervals = [...preferences.expiryNotificationIntervals].sort(
        (a, b) => b - a,
      );
      const now = DateTimezoneUtils.now(preferences.preferredTimezone);

      for (const interval of intervals) {
        const notifyAt = SubscriptionCancellationWorkflow.buildNotifyAt(
          cancellationDate,
          interval,
          preferences.preferredTimezone,
          preferences.notificationTime,
        );

        if (notifyAt.getTime() <= now.getTime()) {
          continue;
        }

        await context.sleepUntil(`wait-${interval}-day`, notifyAt);

        await context.run(`send-${interval}-day-notice`, async () => {
          const { NotificationDeliveryService } = await import(
            "../notification/notificationDeliveryService"
          );

          const latest = await SubscriptionRepository.findById(
            db,
            subscriptionId,
          );
          if (!latest?.willBeCancelledAt) {
            return;
          }

          const latestPrefs = await UserService.getUserPreferences(
            latest.userId,
          );
          if (!latestPrefs.expiryNotificationsEnabled) {
            return;
          }
          if (!latestPrefs.expiryNotificationIntervals.includes(interval)) {
            return;
          }

          const payload = PushNotificationContent.buildExpiryPayload({
            locale: latestPrefs.locale,
            timezone: latestPrefs.preferredTimezone,
            cancellationDate,
            notificationDate: DateTimezoneUtils.now(
              latestPrefs.preferredTimezone,
            ),
            subscriptionId: latest.id,
            subscriptionName: latest.name,
            brandDomain: latest.brandDomain,
          });

          const vapidDetails = PushNotificationService.getVapidDetailsFromEnv();
          await NotificationDeliveryService.sendExpiryNotification(
            latest.userId,
            payload,
            { locale: latestPrefs.locale, vapidDetails },
          );
        });
      }

      await context.run("clear-workflow-id", async () => {
        await SubscriptionRepository.update(db, subscriptionId, {
          cancellationQstashMessageId: null,
        });
      });
    },
  );

  static async schedule(
    payload: SubscriptionCancellationWorkflowPayload,
  ): Promise<string> {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error("Base URL is not set");
    }

    const workflowUrl = `${baseUrl}/api/subscriptions/cancellation-notifications/workflow`;
    const client = SubscriptionCancellationWorkflow.createClient();
    const result = await client.trigger({
      url: workflowUrl,
      body: payload,
    });

    return result.workflowRunId;
  }

  static async cancel(workflowRunId: string): Promise<void> {
    const client = SubscriptionCancellationWorkflow.createClient();
    await client.cancel({ ids: workflowRunId });
  }

  private static buildNotifyAt(
    cancellationDate: string,
    interval: number,
    timezone: string,
    notificationTime: string,
  ): Date {
    return SubscriptionCancellationWorkflow.applyNotificationTime(
      subDays(new Date(cancellationDate), interval),
      timezone,
      notificationTime,
    );
  }

  private static applyNotificationTime(
    date: Date,
    timezone: string,
    notificationTime: string,
  ): Date {
    const [hoursRaw, minutesRaw] = notificationTime.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    const notifyAt = DateTimezoneUtils.toZoned(date, timezone);
    notifyAt.setHours(
      Number.isFinite(hours) ? hours : 10,
      Number.isFinite(minutes) ? minutes : 0,
      0,
      0,
    );

    return notifyAt;
  }

  private static createClient(): Client {
    const token =
      process.env.QSTASH_TOKEN ?? process.env.UPSTASH_WORKFLOW_TOKEN;

    if (!token) {
      throw new Error("QSTASH_TOKEN is not set");
    }

    return new Client({ token });
  }
}
